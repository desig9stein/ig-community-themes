// Calls a tool on the igniteui-theming MCP server (the same server .mcp.json registers for agents).
// Usage: npm run mcp -- <tool> [key=value ...]     (values are parsed as JSON when possible)
//        npm run mcp -- --list
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const pkg = createRequire(import.meta.url).resolve('igniteui-theming/package.json');
const server = join(dirname(pkg), 'dist/mcp/index.js');
const [tool, ...pairs] = process.argv.slice(2);

const client = new Client({ name: 'ig-community-themes', version: '1.0.0' });
await client.connect(new StdioClientTransport({ command: process.execPath, args: [server], stderr: 'ignore' }));

try {
  if (!tool || tool === '--list') {
    const { tools } = await client.listTools();
    for (const t of tools) console.log(`${t.name}\n  ${t.description.split('\n')[0]}`);
  } else {
    const args = Object.fromEntries(
      pairs.map((p) => {
        const i = p.indexOf('=');
        const [k, v] = [p.slice(0, i), p.slice(i + 1)];
        try {
          return [k, JSON.parse(v)];
        } catch {
          return [k, v];
        }
      }),
    );
    const res = await client.callTool({ name: tool, arguments: args });
    for (const c of res.content) console.log(c.text ?? c);
    if (res.isError) process.exitCode = 1;
  }
} finally {
  await client.close();
}
