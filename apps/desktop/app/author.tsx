"use client";
import {useState, type ChangeEvent, type Dispatch, type SetStateAction} from "react";
import {type Locator,type Publication} from "@readium/shared";
import {validateOrlPackage,type OrlPackage,type OrlItem,type OrlLocator} from "@open-reading-layers/core";
import {plain} from "./support";

const TYPES:Record<string,string>={people:"People",timeline:"Timeline",reentry:"Re-entry Context"};
const STYLES:Record<string,string>={plain:"Plain text",note:"Note card","status-board":"Blackboard / status",quote:"Quotation","compact-fact":"Compact fact"};
type ImageData={src:string;alt?:string;decorative?:boolean};
type Editor={id?:string;type:string;label:string;text:string;target:OrlLocator;visual?:ImageData;style:string;data?:Record<string,unknown>};
export function safeImageSrc(value:string|undefined):string|undefined {
  return typeof value==="string"&&value.length<1500000&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)?value:undefined;
}
export function presentationVariant(item:OrlItem):string {
  const d=item.data as Record<string,unknown>|undefined;
  const p=d?.presentation;
  const variant=p&&typeof p==="object"?(p as Record<string,unknown>).variant:undefined;
  return typeof variant==="string"&&variant in STYLES?variant:"plain";
}
export function AuthorWorkspace({book,publication,packages,setPackages,locator,onClose,onImport,onExport,onMessage}:{
  book:{id:string;title:string};publication:Publication;packages:OrlPackage[];setPackages:Dispatch<SetStateAction<OrlPackage[]>>;
  locator:Locator|undefined;onClose:()=>void;onImport:()=>void;onExport:(pkg:OrlPackage)=>void;onMessage:(m:string)=>void;
}) {
  const personalId="urn:orl:personal:"+book.id;
  const [editor,setEditor]=useState<Editor|null>(null);
  const [layerFilter,setLayerFilter]=useState("all");
  const [notice,setNotice]=useState("");
  const [imageBusy,setImageBusy]=useState(false);
  function newEntry(){
    if(!locator){setNotice("Wait for the reader to report a position before creating a note.");return}
    setEditor({type:"people",label:"",text:"",target:plain(locator),style:"plain"});
    setNotice("");
  }
  function editItem(item:OrlItem,type:string,editable:boolean) {
    setEditor({
      id:editable?item.id:undefined,
      type,label:item.label,text:item.text,target:item.target.start,
      visual:item.visual?.src?{src:item.visual.src,alt:item.visual.alt,decorative:item.visual.decorative}:undefined,
      style:presentationVariant(item),
      data: {...(item.data as Record<string,unknown>|undefined??{})},
    });
    setNotice(editable?"Editing your local personal entry.":"Copying an imported entry as a personal draft. The original will remain until you remove that imported package.");
  }
  function removePersonal(itemId:string){
    const existing=packages.find(p=>p.id===personalId);
    if(!existing||!window.confirm("Delete this local personal entry?"))return;
    const changed:{[key:string]:unknown}={...existing,metadata:{...existing.metadata,modified:new Date().toISOString()},layers:existing.layers.map(l=>({...l,items:l.items.filter(i=>i.id!==itemId)}))};
    const check=validateOrlPackage(changed);
    if(!check.valid||!check.package){setNotice("Cannot delete: package validation failed.");return}
    setPackages(old=>old.map(p=>p.id===personalId?check.package!:p));
    setEditor(null);setNotice("Personal entry deleted locally.");
  }
  function save(){
    if(!editor)return;
    if(!editor.label.trim()||!editor.text.trim()){setNotice("A label and a text description are required.");return}
    if(editor.visual&&!editor.visual.decorative&&!editor.visual.alt?.trim()){setNotice("Provide meaningful alternative text for the image, or mark it decorative.");return}
    if(editor.visual&&!safeImageSrc(editor.visual.src)){setNotice("The image is not a supported local PNG/JPEG/WebP data image.");return}
    const pkg=packages.find(p=>p.id===personalId)??{
      schemaVersion:"0.1" as const,id:personalId,
      publication:{identifier:publication.metadata.identifier??"",title:book.title,language:"en"},
      metadata:{title:"My reading support",language:"en",provenance:"personal" as const,created:new Date().toISOString()},layers:[]
    };
    const entry:OrlItem={
      id:editor.id??crypto.randomUUID(),label:editor.label.trim(),text:editor.text.trim(),
      target:{start:editor.target},
      data:{...(editor.data??{}),presentation:{variant:editor.style}},
      ...(editor.visual?{visual:{src:editor.visual.src,alt:editor.visual.decorative?"":editor.visual.alt?.trim()??"",decorative:!!editor.visual.decorative}}:{})
    };
    const layers=pkg.layers.map(l=>({...l,items:l.items.filter(i=>i.id!==entry.id)}));
    const target=layers.find(l=>l.type===editor.type);
    if(target){target.items.push(entry)}
    else layers.push({id:editor.type,type:editor.type,label:TYPES[editor.type]??editor.type,items:[entry]});
    const changed={...pkg,metadata:{...pkg.metadata,modified:new Date().toISOString()},layers};
    const result=validateOrlPackage(changed);
    if(!result.valid||!result.package){setNotice("Validation failed. Capture a valid reading position and try again.");return}
    setPackages(old=>[...old.filter(p=>p.id!==personalId),result.package!]);
    setEditor(null);setNotice("Personal entry saved locally. Use Export for a portable backup.");
  }
  function imageUpload(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];e.currentTarget.value="";
    if(!file)return;
    if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>1000000){
      setNotice("Choose a PNG, JPEG or WebP image no larger than 1 MB.");return;
    }
    setImageBusy(true);
    const reader=new FileReader();
    reader.onload=()=>{const src=String(reader.result??"");
      if(!safeImageSrc(src)){setNotice("Could not prepare this image.");}
      else setEditor(old=>old?{...old,visual:{src,alt:old.visual?.alt??"",decorative:false}}:null);
      setImageBusy(false);
    };
    reader.onerror=()=>{setNotice("Could not read this image from your device.");setImageBusy(false)};
    reader.readAsDataURL(file);
  }
  const entryCount=packages.reduce((n,p)=>n+p.layers.reduce((sum,l)=>sum+l.items.length,0),0);
  return <aside className="author-panel" aria-label="Author Workspace">
    <header className="panel-header">
      <h2>Author Workspace</h2>
      <button type="button" onClick={()=>{setEditor(null);onClose()}}>Return to reading</button>
    </header>
    <p className="author-warning">Author mode shows <strong>all</strong> annotations, including future story information. Reader mode still hides entries until their reveal position.</p>
    <p className="muted">Editing the support package never changes the EPUB text. Capture a reading location to anchor each new entry.</p>
    <div className="panel-actions">
      <button className="primary" type="button" onClick={newEntry} disabled={!locator}>Add support entry here</button>
      <button type="button" onClick={onImport}>Import ORL JSON</button>
    </div>
    <p className="muted">Current anchor: <code>{locator?.href??"Reading position unavailable"}</code></p>
    <p role="status" className="notice">{notice}</p>
    {editor&&<form className="editor" onSubmit={e=>{e.preventDefault();save()}}>
      <h3>{editor.id?"Edit personal entry":"New personal draft"}</h3>
      <label>Layer<select value={editor.type} onChange={e=>setEditor({...editor,type:e.target.value})}>
        {Object.entries(TYPES).map(([key,label])=><option key={key} value={key}>{label}</option>)}
      </select></label>
      <label>Label<input required maxLength={200} value={editor.label} onChange={e=>setEditor({...editor,label:e.target.value})}/></label>
      <label>Support text<textarea required rows={5} maxLength={20000} value={editor.text} onChange={e=>setEditor({...editor,text:e.target.value})}/></label>
      <label>Text presentation<select value={editor.style} onChange={e=>setEditor({...editor,style:e.target.value})}>
        {Object.entries(STYLES).map(([key,label])=><option key={key} value={key}>{label}</option>)}
      </select></label>
      <p>Reveal position: <code>{editor.target.href}</code></p>
      <button type="button" disabled={!locator} onClick={()=>locator&&setEditor({...editor,target:plain(locator)})}>Capture current reader position</button>
      <label>Optional image (PNG, JPEG or WebP, up to 1 MB)
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={imageUpload}/>
      </label>
      <p className="muted">The starter image bank is included with the Old Demon fixture. Choose a PNG from that folder, or upload your own. Only local, inline images are exported; remote image links are not accepted.</p>
      {imageBusy&&<p>Preparing image…</p>}
      {editor.visual&&<div className="author-image-preview">
        {safeImageSrc(editor.visual.src)&&<img src={safeImageSrc(editor.visual.src)} alt={editor.visual.decorative?"":editor.visual.alt??"Preview"} />}
        <label className="toggle"><input type="checkbox" checked={!!editor.visual.decorative} onChange={e=>setEditor({...editor,visual:{...editor.visual!,decorative:e.target.checked}})}/>Decorative image (no information conveyed)</label>
        {!editor.visual.decorative&&<label>Alternative text<input value={editor.visual.alt??""} onChange={e=>setEditor({...editor,visual:{...editor.visual!,alt:e.target.value}})} maxLength={400}/></label>}
        <button type="button" onClick={()=>setEditor({...editor,visual:undefined})}>Remove image</button>
      </div>}
      <div className="panel-actions">
        <button className="primary" type="submit" disabled={imageBusy}>Save personal entry</button>
        <button type="button" onClick={()=>setEditor(null)}>Cancel</button>
      </div>
    </form>}
    <label className="author-filter">Show layer<select value={layerFilter} onChange={e=>setLayerFilter(e.target.value)}>
      <option value="all">All layers</option>
      {Object.entries(TYPES).map(([key,label])=><option key={key} value={key}>{label}</option>)}
    </select></label>
    <h3>Support entries ({entryCount})</h3>
    {packages.length===0&&<p>No support layers yet. Add an entry or import a matching ORL package.</p>}
    {packages.map(pkg=><section className="author-package" key={pkg.id}>
      <div className="panel-header">
        <h4>{pkg.metadata.title}</h4>
        <button type="button" onClick={()=>onExport(pkg)}>Export JSON</button>
      </div>
      <p className="muted">{pkg.metadata.provenance} · {pkg.id===personalId?"Editable personal draft":"Imported package (copy entries to edit)"}</p>
      {pkg.layers.filter(l=>layerFilter==="all"||l.type===layerFilter).map(layer=>
        <div key={layer.id}>
          <h4>{TYPES[layer.type]??layer.label}</h4>
          {layer.items.map(item=><article className="author-entry" key={item.id}>
            <strong>{item.label}</strong>
            <p className="muted">{item.target.start.href}</p>
            <p>{item.text}</p>
            {item.visual&&safeImageSrc(item.visual.src)&&<img className="support-image" src={safeImageSrc(item.visual.src)} alt={item.visual.decorative?"":item.visual.alt??""}/>}
            <p className="muted">Display: {STYLES[presentationVariant(item)]}</p>
            <div className="panel-actions">
              <button type="button" onClick={()=>editItem(item,layer.type,pkg.id===personalId)}>{pkg.id===personalId?"Edit":"Copy to personal"}</button>
              {pkg.id===personalId&&<button type="button" onClick={()=>removePersonal(item.id)}>Delete</button>}
            </div>
          </article>)}
        </div>
      )}
    </section>)}
  </aside>
}