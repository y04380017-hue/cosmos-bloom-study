const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../collection');
const specs=[...require('../collection/specimens.json'),require('../collection/cosmos-specimen.json')];
module.exports=specs.map(c=>({...c,surfaceMaps:JSON.parse(fs.readFileSync(path.join(root,'textures',c.slug+'.json'),'utf8'))}));
