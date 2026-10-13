const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({headless:true, channel: process.env.BROWSER_CHANNEL || undefined});
 const page = await browser.newPage();
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3000');
 await page.getByRole('button',{name:'Enter Curriculum'}).click();
 const cards=page.getByRole('button',{name:/^Join /}); const count=await cards.count(); assert(count>0);
 await page.getByRole('searchbox').fill('no course matches this'); assert.equal(await cards.count(),0);
 await page.getByRole('button',{name:'Reset filters'}).click(); assert.equal(await cards.count(),count);
 await page.getByLabel('Learning level').selectOption('School'); assert((await cards.count())<count);
 await page.getByRole('button',{name:'Reset filters'}).click();
 await cards.first().focus(); await page.keyboard.press('Enter');
 await page.getByRole('button',{name:'Notebook'}).click(); await page.getByLabel('Personal course notes').fill('Persist this lesson note.');
 await page.getByRole('button',{name:'Begin Class'}).click(); await page.getByRole('alert').filter({hasText:'Gemini API key'}).waitFor();
 await page.getByRole('button',{name:'Exit Session'}).click();
 await page.getByRole('button',{name:'Curriculum',exact:true}).click(); await cards.first().click();
 await page.getByRole('button',{name:'Notebook'}).click(); assert.equal(await page.getByLabel('Personal course notes').inputValue(),'Persist this lesson note.');
 await page.getByRole('button',{name:'Exit Session'}).click();
 await page.evaluate(()=>localStorage.setItem('edu_history','broken JSON')); await page.reload(); await page.getByRole('button',{name:'Archive',exact:true}).click();
 await page.getByText('Your completed classes will appear').waitFor();
 await page.evaluate(()=>localStorage.setItem('edu_history',JSON.stringify([{id:'test',courseId:'test',courseTitle:'Saved test lesson',teacherName:'Teacher',timestamp:Date.now(),duration:42,videoUrl:'',transcript:[{user:'',ai:'Saved conversation'}],whiteboard:[{id:'board',type:'code',content:'print(42)',timestamp:Date.now()}]}])));
 await page.reload(); await page.getByRole('button',{name:'Archive',exact:true}).click(); await page.getByRole('button',{name:'Review Session'}).click();
 await page.getByText('Saved conversation',{exact:false}).waitFor(); await page.keyboard.press('Escape'); assert.equal(await page.getByRole('dialog').count(),0);
 for(const width of [390,768,1440]) {
  await page.setViewportSize({width,height:900}); await page.getByRole('button',{name:'Home',exact:true}).click();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`home overflow ${width}`);
  await cards.first().click(); assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`class overflow ${width}`);
  await page.screenshot({path:`/tmp/edu-class-${width}.png`,fullPage:true}); await page.getByRole('button',{name:'Exit Session'}).click();
 }
 assert.deepEqual(errors,[]); console.log('PASS: navigation, filters, keyboard joining, notes persistence, missing-key feedback, corrupt storage, archive review/Escape, responsive widths; no uncaught browser errors.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
