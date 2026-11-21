// Every added source must have an independent, correctly ordered three-stage review page.
const fs=require('fs'),path=require('path'),assert=require('assert');
const out=path.resolve(__dirname,'../dist/flowers'),batch=require('../collection/remaining49-review.json');
const read=n=>fs.readFileSync(path.join(out,n),'utf8');
assert(fs.existsSync(out+'/remaining49.html'),'49-flower review directory missing');
const cards=s=>[...s.matchAll(/class="card"[^>]*href="([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual(cards(read('remaining49.html')),batch.map(x=>x.url));
const all=cards(read('index.html'));assert.equal(all.length,83);assert.equal(new Set(all).size,83);
assert.equal(cards(read('baseline12.html')).length,12);assert.equal(cards(read('cup26.html')).length,26);
for(const [i,b] of batch.entries()){
 const page=read(b.url),prev=i?batch[i-1].url:'remaining49.html',next=i<48?batch[i+1].url:'remaining49.html';
 assert(page.includes(`data-remaining-prev href="${prev}"`),b.slug+' previous review');
 assert(page.includes(`data-remaining-next href="${next}"`),b.slug+' next review');
 for(const p of [0,.5,1])assert(page.includes(`data-progress="${p}"`),b.slug+' missing stage');
 assert(page.includes('新增待检查'));assert(page.includes('全部83种'));assert(!page.includes('全部34种'));
 assert(all.includes(b.url));
}
for(const url of all.slice(0,34))assert(read(url).includes('已验收'),url+' lost accepted label');
assert(read('../index.html').includes('flowers/remaining49.html'),'Historical root must link to additions');
console.log('PASS 83 independent entries, ordered 49 review chain, accepted 12/26 groups and root entry');
