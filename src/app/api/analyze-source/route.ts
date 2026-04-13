import { NextRequest, NextResponse } from "next/server";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { writeFileSync, unlinkSync, rmdirSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { sourceCode } = body as { sourceCode?: string };

  if (!sourceCode || !sourceCode.trim()) {
    return NextResponse.json(
      { error: "sourceCode is required and must be non-empty" },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  // Write source code to a temp file
  const tmpDir = mkdtempSync(join(tmpdir(), "sol-analyze-"));
  const tmpFile = join(tmpDir, "contract.sol");
  try {
    writeFileSync(tmpFile, sourceCode, "utf-8");

    const systemPrompt = `You are an expert smart contract security auditor specializing in EVM (Ethereum Virtual Machine) Solidity contracts.

Analyze the provided Solidity source code file at the path given in the user's message. Your analysis should cover:

1. **Overview**: Brief description of what the contract does
2. **Vulnerability Assessment**: Identify any security vulnerabilities including but not limited to:
   - Reentrancy attacks
   - Integer overflow/underflow
   - Unchecked external calls
   - Access control issues
   - Front-running vulnerabilities
   - Denial of Service (DoS) vectors
   - Uninitialized storage pointers
   -tx.origin usage
   - Delegatecall injection risks
   - Oracle manipulation risks
   - Flash loan attack vectors
3. **Centralization & Admin Risk**: Identify admin/owner privileges that could be abused:
   - Mutable state variables
   - Owner-only functions
   - Upgrade mechanisms
   - Pause functionality
   - Blacklist/whitelist capabilities
   - Mint/burn privileges
4. **Code Quality Issues**: Note any code smells or best practice violations
5. **Risk Score**: Provide an overall risk score from 0 (safe) to 100 (dangerous) with justification

Format your response in clear markdown with headers and bullet points. Be specific about line numbers or function names where vulnerabilities exist.`;

    const conversation = query({
      prompt: `Please analyze this Solidity smart contract source code file for security risks and vulnerabilities: ${tmpFile}`,
      options: {
        systemPrompt,
        allowedTools: ["Read"],
        permissionMode: "dontAsk",
        persistSession: false,
        maxTurns: 5,
        cwd: tmpDir,
        env: { ...process.env, ANTHROPIC_API_KEY: apiKey },
      },
    });

    let analysis = "";
    let costUsd = 0;

    for await (const message of conversation) {
      if (message.type === "result") {
        const result = message as { result?: string; total_cost_usd?: number };
        if (result.result) {
          analysis = result.result;
        }
        costUsd = result.total_cost_usd ?? 0;
      }
    }

    if (!analysis) {
      return NextResponse.json(
        { error: "AI analysis returned no results" },
        { status: 502 }
      );
    }

    return NextResponse.json({ analysis, costUsd });
  } catch (error) {
    console.error("Source analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze source code" },
      { status: 502 }
    );
  } finally {
    // Clean up temp file
    try {
      unlinkSync(tmpFile);
    } catch {
      // ignore cleanup errors
    }
    try {
      rmdirSync(tmpDir);
    } catch {
      // ignore cleanup errors
    }
  }
}
