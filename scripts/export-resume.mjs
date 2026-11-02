// 导出简历 PDF：公开版不含私密信息；投递版在本地注入 private/contact.json 中的姓名与联系方式。
// 私密文件已被 .gitignore 排除，本脚本只输出文件路径，不打印任何私密字段的值。
/* global console, document */
import { chromium } from 'playwright';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = path.join(root, 'public/resume.html');
const publicPdf = path.join(root, 'public/resume.pdf');
const privateDir = path.join(root, 'private');
const contactFile = path.join(privateDir, 'contact.json');
const privatePdf = path.join(privateDir, 'resume-投递版.pdf');

async function exportPdf(page, out) {
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: out, format: 'A4', preferCSSPageSize: true, printBackground: true });
  // 简历必须保持单页，超出时提示调整内容
  const pages = (await readFile(out, 'latin1')).match(/\/Type\s*\/Page[^s]/g)?.length ?? 0;
  console.log(`${path.relative(root, out)}：${pages} 页${pages > 1 ? '（超过一页，需要精简内容）' : ''}`);
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(html).href);
await exportPdf(page, publicPdf);

if (!existsSync(contactFile)) {
  await mkdir(privateDir, { recursive: true });
  await copyFile(path.join(root, 'scripts/contact.example.json'), contactFile);
  console.log('已生成 private/contact.json 模板，填写后重新运行即可导出投递版。');
} else {
  const contact = JSON.parse(await readFile(contactFile, 'utf8'));
  await page.evaluate(({ name, phone, email }) => {
    document.querySelector('[data-private="name"]').textContent = name || '';
    document.querySelector('[data-private="contact"]').textContent = [phone, email].filter(Boolean).join(' · ');
  }, contact);
  await exportPdf(page, privatePdf);
}

await browser.close();
