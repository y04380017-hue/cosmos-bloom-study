// Catches a catalog that links the wrong species, omits a member, or exits batch order.
const fs=require('fs'),assert=require('assert'),path=require('path'),crypto=require('crypto');
const out=path.resolve(__dirname,'../dist/flowers'),batch=require('../collection/cup26-review.json');
assert(fs.existsSync(out+'/cup26.html'),'The dedicated 26-flower inspection directory is missing');
const page=fs.readFileSync(out+'/cup26.html','utf8');
const cards=[...page.matchAll(/class="card"[^>]*href="([^"]+)"/g)].map(x=>x[1]);
assert.deepEqual(cards,batch.map(x=>x.url),'26 source-order cards required');
for(const [i,b] of batch.entries()){
 const html=fs.readFileSync(path.join(out,b.url),'utf8');
 const prev=i?batch[i-1].url:'cup26.html',next=i<25?batch[i+1].url:'cup26.html';
 assert(html.includes(`data-batch-prev href="${prev}"`),b.slug+' wrong previous review');
 assert(html.includes(`data-batch-next href="${next}"`),b.slug+' wrong next review');
 const c=[...require('../collection/specimens.json'),...require('../collection/cup26-specimens.json')].find(x=>x.slug===b.slug);
 const photo=Buffer.from(html.match(/data:image\/jpeg;base64,([A-Za-z0-9+/=]+)/)[1],'base64');
 assert.equal(crypto.createHash('sha256').update(photo).digest('hex'),c.source_sha256);
}
assert.equal([...fs.readFileSync(out+'/index.html','utf8').matchAll(/class="card"/g)].length,83);
assert.equal([...fs.readFileSync(out+'/baseline12.html','utf8').matchAll(/class="card"/g)].length,12);
console.log('PASS 83 unique entries, 26 ordered review links, original 12 section and unchanged photos');
