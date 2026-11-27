(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.CommonFiles=api;})(globalThis,function(){'use strict';
function path(v){const x=String(v??'').trim();if(x.length>120||!x.split('/').every(s=>/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,59}$/.test(s))||!(/\.(md|txt|py|json|csv)$/i.test(x)))throw Error('Use a relative project path ending in .md, .txt, .py, .json or .csv.');return x;}
function body(v){const x=String(v??'');if(x.length>40000)throw Error('Text files are limited to 40,000 characters.');return x;}
function list(p){return Array.isArray(p.files)?p.files:[];}
function write(p,name,content,id){const files=list(p),name2=path(name),text=body(content),old=id?files.find(f=>f.id===id):null;if(id&&!old)throw Error('File not found.');if(files.some(f=>f.path.toLowerCase()===name2.toLowerCase()&&f.id!==id))throw Error('A file already exists at that path.');if(!id&&files.length>=30)throw Error('Maximum 30 text files per project.');if(old&&old.path===name2&&old.content===text)return p;const at=new Date().toISOString(),revision=old?{path:old.path,content:old.content,at:old.updated}:null;const f={id:old?.id||crypto.randomUUID(),path:name2,content:text,updated:at,revisions:old?[revision,...(old.revisions||[])].slice(0,4):[]};return {...p,files:old?files.map(x=>x.id===id?f:x):[...files,f]};}
function remove(p,id){return {...p,files:list(p).filter(f=>f.id!==id)};}
function restore(p,id,index){const f=list(p).find(x=>x.id===id),r=f?.revisions?.[index];if(!r)throw Error('Revision not found.');return write(p,r.path,r.content,id);}
const SEARCH_LIMIT = 240;
const SOURCE_LIMIT = 40000;

function search(project, query) {
  if (typeof query !== 'string' || !query || query.length > SEARCH_LIMIT) {
    throw Error('Enter 1–240 characters to search.');
  }
  const matches = [];
  for (const file of list(project)) {
    let offset = file.content.indexOf(query);
    if (offset < 0) continue;
    const at = offset;
    let count = 0;
    while (offset >= 0) {
      count++;
      offset = file.content.indexOf(query, offset + query.length);
    }
    matches.push({ file, count, before: file.content.slice(Math.max(0, at - 32), at),
      after: file.content.slice(at + query.length, at + query.length + 32) });
  }
  return matches;
}

function replaceReviewed(project, matches, selectedIds, query, replacement) {
  if (!selectedIds.size) throw Error('Select at least one matching file.');
  if (typeof replacement !== 'string' || replacement.length > SEARCH_LIMIT || query === replacement) {
    throw Error('Enter different replacement text up to 240 characters.');
  }
  const current = new Map(list(project).map(file => [file.id, file]));
  const changes = matches.filter(match => selectedIds.has(match.file.id));
  if (changes.length !== selectedIds.size) throw Error('Selection is out of date. Search again.');
  for (const { file, count } of changes) {
    const latest = current.get(file.id);
    if (latest?.path !== file.path || latest.content !== file.content || latest.updated !== file.updated) {
      throw Error('A selected file changed. Review the search results again.');
    }
    if (file.content.length + count * (replacement.length - query.length) > SOURCE_LIMIT) {
      throw Error(file.path + ' would exceed the 40,000-character file limit.');
    }
  }
  return changes.reduce((next, { file }) =>
    write(next, file.path, file.content.replaceAll(query, () => replacement), file.id), project);
}

return {path,body,list,write,remove,restore,search,replaceReviewed};});
