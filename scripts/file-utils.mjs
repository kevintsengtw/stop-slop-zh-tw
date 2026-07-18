import { randomUUID } from 'node:crypto';
import { chmodSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

export function atomicWriteFile(file, content) {
  const directory = dirname(file);
  const temporary = join(directory, `.${basename(file)}.${process.pid}.${randomUUID()}.tmp`);
  const mode = statSync(file).mode;
  try {
    writeFileSync(temporary, content, 'utf8');
    chmodSync(temporary, mode);
    renameSync(temporary, file);
  } catch (error) {
    try {
      rmSync(temporary, { force: true });
    } catch {
      // 保留原始錯誤；暫存檔清理失敗不應蓋過寫回失敗原因。
    }
    throw error;
  }
}
