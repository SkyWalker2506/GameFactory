/**
 * @license
 * Copyright 2026 GameFactory
 * SPDX-License-Identifier: Apache-2.0
 *
 * CliContentGenerator — routes LLM requests through locally-installed
 * subscription CLIs (claude, codex, gemini) instead of paid API endpoints.
 *
 * Trade-offs:
 *  - No streaming (CLIs return full response then we yield once).
 *  - No fine-grained tool-use loop (CLIs run their own).
 *  - Token counting is approximate (4 chars ≈ 1 token).
 *  - Embeddings not supported.
 */

import { spawn } from 'node:child_process';
import type {
  Content,
  CountTokensParameters,
  CountTokensResponse,
  EmbedContentParameters,
  EmbedContentResponse,
  GenerateContentParameters,
  Part,
} from '@google/genai';
import { GenerateContentResponse } from '@google/genai';
import type { Config } from '../../config/config.js';
import type {
  ContentGenerator,
  ContentGeneratorConfig,
} from '../contentGenerator.js';
import { AuthType } from '../contentGenerator.js';

type CliKind = 'claude' | 'codex' | 'gemini' | 'opencode';

interface CliSpec {
  bin: string;
  args: (prompt: string, model?: string) => string[];
  parse: (stdout: string) => string;
  installHint: string;
}

const CLI_SPECS: Record<CliKind, CliSpec> = {
  claude: {
    bin: 'claude',
    args: (_prompt, model) => {
      const a = ['-p', '--output-format', 'json'];
      if (model) a.push('--model', model);
      return a;
    },
    parse: (stdout) => {
      try {
        const j = JSON.parse(stdout);
        return j.result ?? j.text ?? stdout;
      } catch {
        return stdout;
      }
    },
    installHint: 'npm i -g @anthropic-ai/claude-code',
  },
  codex: {
    bin: 'codex',
    args: (_prompt, model) => {
      const a = ['exec', '--skip-git-repo-check'];
      if (model) a.push('-m', model);
      a.push('-');
      return a;
    },
    parse: (stdout) => stdout.trim(),
    installHint: 'npm i -g @openai/codex',
  },
  gemini: {
    bin: 'gemini',
    args: (_prompt, model) => {
      const a = ['-p', '-'];
      if (model) a.push('-m', model);
      return a;
    },
    parse: (stdout) => stdout.trim(),
    installHint: 'npm i -g @google/gemini-cli',
  },
  opencode: {
    bin: 'opencode',
    args: (prompt, model) => {
      const a = ['run'];
      if (model) a.push('-m', model);
      a.push(prompt);
      return a;
    },
    parse: (stdout) => stdout.trim(),
    installHint: 'npm i -g opencode-ai',
  },
};

function authToKind(auth: AuthType | undefined): CliKind {
  switch (auth) {
    case AuthType.USE_CLAUDE_CLI:
      return 'claude';
    case AuthType.USE_CODEX_CLI:
      return 'codex';
    case AuthType.USE_GEMINI_CLI:
      return 'gemini';
    case AuthType.USE_OPENCODE_CLI:
      return 'opencode';
    default:
      throw new Error(`CliContentGenerator: unsupported authType ${auth}`);
  }
}

function flattenContents(
  params: GenerateContentParameters,
): string {
  const parts: string[] = [];
  const sys = params.config?.systemInstruction;
  if (sys) {
    const sysText =
      typeof sys === 'string'
        ? sys
        : Array.isArray(sys)
        ? (sys as Part[]).map((p) => (p as { text?: string }).text ?? '').join('\n')
        : (sys as { text?: string }).text ?? '';
    if (sysText.trim()) parts.push(`[SYSTEM]\n${sysText}`);
  }

  const contents = Array.isArray(params.contents)
    ? (params.contents as Content[])
    : params.contents
    ? [params.contents as Content]
    : [];

  for (const c of contents) {
    const role = (c.role ?? 'user').toUpperCase();
    const text = (c.parts ?? [])
      .map((p) => (p as { text?: string }).text ?? '')
      .filter(Boolean)
      .join('\n');
    if (text) parts.push(`[${role}]\n${text}`);
  }
  return parts.join('\n\n');
}

function approxTokens(s: string): number {
  return Math.max(1, Math.ceil(s.length / 4));
}

function runCli(
  spec: CliSpec,
  prompt: string,
  model: string | undefined,
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(spec.bin, spec.args(prompt, model), {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`${spec.bin} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (err += d.toString()));
    child.on('error', (e) => {
      clearTimeout(timer);
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(
          new Error(
            `CLI '${spec.bin}' not found on PATH. Install: ${spec.installHint}`,
          ),
        );
      } else {
        reject(e);
      }
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`${spec.bin} exited ${code}: ${err.slice(0, 400)}`));
        return;
      }
      resolve(out);
    });

    child.stdin.end(prompt);
  });
}

export class CliContentGenerator implements ContentGenerator {
  private kind: CliKind;
  private spec: CliSpec;

  constructor(
    private cfg: ContentGeneratorConfig,
    _gcConfig: Config,
  ) {
    this.kind = authToKind(cfg.authType);
    this.spec = CLI_SPECS[this.kind];
  }

  async generateContent(
    params: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<GenerateContentResponse> {
    const prompt = flattenContents(params);
    const timeoutMs = this.cfg.timeout ?? 900_000;
    const stdout = await runCli(this.spec, prompt, this.cfg.model, timeoutMs);
    const text = this.spec.parse(stdout);

    const response = new GenerateContentResponse();
    response.responseId = `cli-${Date.now()}`;
    response.createTime = Date.now().toString();
    response.modelVersion = this.cfg.model || this.kind;
    response.promptFeedback = { safetyRatings: [] };
    response.candidates = [
      {
        content: {
          role: 'model',
          parts: [{ text } as Part],
        },
        index: 0,
        safetyRatings: [],
        finishReason: 'STOP' as never,
      },
    ];
    response.usageMetadata = {
      promptTokenCount: approxTokens(prompt),
      candidatesTokenCount: approxTokens(text),
      totalTokenCount: approxTokens(prompt) + approxTokens(text),
    };
    return response;
  }

  async generateContentStream(
    params: GenerateContentParameters,
    userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const full = await this.generateContent(params, userPromptId);
    async function* one() {
      yield full;
    }
    return one();
  }

  async countTokens(
    req: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    const contents = Array.isArray(req.contents)
      ? (req.contents as Content[])
      : [req.contents as Content];
    const total = contents
      .flatMap((c) => c.parts ?? [])
      .map((p) => (p as { text?: string }).text ?? '')
      .reduce((a, t) => a + approxTokens(t), 0);
    return { totalTokens: total } as CountTokensResponse;
  }

  async embedContent(
    _req: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    throw new Error(
      'CliContentGenerator: embeddings not supported via subscription CLIs',
    );
  }

  useSummarizedThinking(): boolean {
    return false;
  }
}
