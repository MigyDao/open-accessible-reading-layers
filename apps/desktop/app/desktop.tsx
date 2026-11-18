"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {invoke} from "@tauri-apps/api/core";
import {Link,Locator,type Publication} from "@readium/shared";
import {StatefulReaderWrapper,StatefulGlobalPreferencesProvider,ThStoreProvider,usePublication,useEpubNavigator} from "@edrlab/thorium-web/reader";
import {createPreferences,defaultPreferences,defaultFontCollection,ThLayoutUI,ThSettingsKeys} from "@edrlab/thorium-web/core/preferences";
import {setScroll,useAppDispatch,useAppSelector} from "@edrlab/thorium-web/core/lib";
import {validateOrlPackage,type OrlPackage,type OrlLocator,type OrlItem} from "@open-reading-layers/core";
import {eligible,packagesForBook,plain,type Visible} from "./support";

type Book={id:string;title:string;identifier:string};
type Saved={locator?:Record<string,unknown>;enabled?:Record<string,boolean>};
type Opened={url:string;state:Saved|null;packages:unknown};
const labels:Record<string,string>={people:"People / Characters",timeline:"Timeline",reentry:"Re-entry Context"};
// In scroll mode keep Thorium's chapter footer visible instead of hover-only bars.
const readerPreferences=createPreferences({...defaultPreferences,
  theming:{...defaultPreferences.theming,layout:{...defaultPreferences.theming.layout,
    ui:{...defaultPreferences.theming.layout.ui,reflow:ThLayoutUI.stacked}}},
  settings:{...defaultPreferences.settings,keys:{...defaultPreferences.settings.keys,
  [ThSettingsKeys.fontFamily]:{default:Object.fromEntries(Object.entries(defaultFontCollection).filter(([,f])=>f.source.type==="system"))}}}});
function errorText(e:unknown){return e instanceof Error?e.message:String(e)}
export default function Desktop(){
  const [books,setBooks]=useState<Book[]>([]),[opened,setOpened]=useState<{book:Book;data:Opened}|null>(null),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  const libraryHeading=useRef<HTMLHeadingElement>(null),library=useRef<HTMLElement>(null),libraryScroll=useRef(0),lastBook=useRef<string|null>(null);
  const refresh=useCallback(async()=>setBooks(await invoke<Book[]>("list_books")),[]);
  useEffect(()=>{void refresh().catch(e=>setMessage(errorText(e)))},[refresh]);
  useEffect(()=>{
    if(opened||!lastBook.current)return;
    const frame=requestAnimationFrame(()=>{
      if(library.current)library.current.scrollTop=libraryScroll.current;
      const button=document.getElementById("continue-"+lastBook.current);
      if(button){button.focus({preventScroll:true});button.scrollIntoView({block:"nearest"})}
      else libraryHeading.current?.focus();
    });
    return ()=>cancelAnimationFrame(frame);
  },[opened]);
  async function open(book:Book){libraryScroll.current=library.current?.scrollTop??0;lastBook.current=book.id;setBusy(true);try{setOpened({book,data:await invoke<Opened>("open_book",{id:book.id})});setMessage("")}catch(e){setMessage(errorText(e))}finally{setBusy(false)}}
  async function importBook(){setBusy(true);try{const id=await invoke<string|null>("import_book");await refresh();if(id){const list=await invoke<Book[]>("list_books");const book=list.find(b=>b.id===id);if(book)await open(book)}}catch(e){setMessage(errorText(e))}finally{setBusy(false)}}
  if(opened)return <ThStoreProvider key={opened.book.id} storageKey={"orl-preferences-"+opened.book.id}><StatefulGlobalPreferencesProvider initialPreferences={{locale:"en"}}>
    <PublicationReader book={opened.book} data={opened.data} onClose={()=>{setOpened(null);void refresh()}}/>
  </StatefulGlobalPreferencesProvider></ThStoreProvider>;
  return <main className="library" ref={library} tabIndex={0} aria-label="Book library">
    <p className="eyebrow">ORL � WINDOWS V1 BETA</p><h1 tabIndex={-1} ref={libraryHeading}>A little support.<br/>Your own reading.</h1>
    <p className="intro">Read DRM-free EPUB books offline. Bring people, timelines and context back into view when you need them.</p>
    <button className="primary" onClick={()=>void importBook()} disabled={busy}>Import EPUB</button>
    <p className="muted">Books and personal layers stay on this device. Your original files are preserved.</p>
    <p role="status">{message}{busy?" Opening.":""}</p>
    <section aria-labelledby="library-heading"><h2 id="library-heading">Your library</h2>
    <div className="books">{books.map(book=><article className="book" key={book.id}>
      <h3>{book.title}</h3><button className="book-cover" aria-label={"Open "+book.title} onClick={()=>void open(book)} disabled={busy}><span aria-hidden="true">ORL</span></button>
      <button id={"continue-"+book.id} aria-label={"Continue reading "+book.title} onClick={()=>void open(book)} disabled={busy}>Continue reading</button>
      <button className="quiet" onClick={async()=>{if(!window.confirm("Remove this app copy and its local support/position? Original EPUB stays untouched. Export personal layers first."))return;
        try{await invoke("remove_book",{id:book.id});await refresh()}catch(e){setMessage(errorText(e))}}}>Remove from library</button>
    </article>)}</div></section>
    <footer>Personal-use beta � Functional and accessibility acceptance pending your testing.</footer>
  </main>;
}
function PublicationReader({book,data,onClose}:{book:Book;data:Opened;onClose:()=>void}){
  const {publication,profile,isLoading,error}=usePublication({url:data.url,onError:e=>console.error("EPUB loading",e)});
  if(error)return <main className="library"><h1>Unable to open this book</h1><p>The original EPUB is unchanged.</p><button onClick={onClose}>Back to library</button></main>;
  if(isLoading||!publication)return <main className="library"><p role="status">Opening {book.title}.</p><button onClick={onClose}>Back to library</button></main>;
  return <Reading book={book} data={data} publication={publication} profile={profile} onClose={onClose}/>;
}
function Reading({book,data,publication,profile,onClose}:{book:Book;data:Opened;publication:Publication;profile:"epub"|"webPub"|"audio"|null|undefined;onClose:()=>void}){
  const [packages,setPackages]=useState<OrlPackage[]>(()=>packagesForBook(data.packages,publication));
  const [enabled,setEnabled]=useState<Record<string,boolean>>(data.state?.enabled??{people:true,timeline:true,reentry:true});
  const [support,setSupport]=useState(false),[visible,setVisible]=useState<Visible[]>([]),[message,setMessage]=useState("");
  const [locator,setLocator]=useState<Locator|undefined>(()=>Locator.deserialize(data.state?.locator));
  const [draft,setDraft]=useState<{id?:string;type:string;label:string;text:string;target:OrlLocator}|null>(null);
  const [pending,setPending]=useState<OrlPackage|null>(null),[saving,setSaving]=useState(false);
  const scroll=useAppSelector(state=>state.settings.scroll),isFXL=useAppSelector(state=>state.publication.isFXL);
  const readerLoading=useAppSelector(state=>state.reader.isLoading),dispatch=useAppDispatch();
  const readerProgressIndex=useAppSelector(state=>state.publication.progress?.progression?.currentIndex);
  const {getSetting,submitPreferences,goLink}=useEpubNavigator();
  const [layoutBusy,setLayoutBusy]=useState(false);
  const readingSurface=useRef<HTMLElement>(null),wasCompact=useRef<boolean|null>(null);
  const automaticLayout=useRef<boolean|null>(null),intendedScroll=useRef(scroll);
  const modeQueue=useRef(Promise.resolve());
  const current=useRef(locator),generation=useRef(0),queue=useRef(Promise.resolve()),supportButton=useRef<HTMLButtonElement>(null),supportHeading=useRef<HTMLHeadingElement>(null),editorHeading=useRef<HTMLHeadingElement>(null);
  const snapshot=useRef({packages,enabled});snapshot.current={packages,enabled};
  const active=useMemo(()=>packagesForBook(packages,publication),[packages,publication]);
  const readingOrder=publication.readingOrder.items;
  // Resolve against the publication's actual reading order. The persisted locator
  // normally has the latest href; use Thorium's 1-based progress index during
  // initial loading, before ORL receives a position callback.
  const chapterIndex=useMemo(()=>{
    const href=locator?.href;
    if(href){
      const canonical=(value:string)=>{
        try{return new URL(value.split("#")[0],data.url).href}
        catch{return value.split("#")[0]}
      };
      const idx=readingOrder.findIndex(item=>canonical(item.href)===canonical(href));
      if(idx>=0)return idx;
    }
    return typeof readerProgressIndex==="number"&&Number.isInteger(readerProgressIndex)
      &&readerProgressIndex>=1&&readerProgressIndex<=readingOrder.length
      ?readerProgressIndex-1:-1;
  },[data.url,locator?.href,readerProgressIndex,readingOrder]);
  function goChapter(direction:-1|1){
    if(!scroll||readerLoading||isFXL||chapterIndex<0)return;
    const target=readingOrder[chapterIndex+direction];
    if(!target)return;
    // This is the same navigator API used by Thorium's built-in footer.
    // Position storage and spoiler gating continue through the existing
    // positionChanged callback, not a synthetic ORL locator.
    goLink(new Link({href:target.href}),false,ok=>{
      if(!ok)setMessage("Could not open that chapter. Try the table of contents.");
    });
  }
  const persist=useCallback((position:Locator|undefined)=>{
    const state={enabled:snapshot.current.enabled,locator:position?.serialize()};
    const packages=snapshot.current.packages;
    setSaving(true);
    const job=queue.current.catch(()=>{}).then(()=>invoke<void>("save_book",{id:book.id,state,packages}));
    queue.current=job.then(()=>{setSaving(false)},e=>{setSaving(false);setMessage("Could not save local changes: "+errorText(e));throw e});
    void queue.current.catch(()=>{});
  },[book.id]);
  const update=useCallback(async(loc:Locator)=>{
    current.current=loc;setLocator(loc);setVisible([]);setDraft(null);setPending(null);
    persist(loc);
  },[persist]);
  const positionStorage=useMemo(()=>({get:()=>current.current,set:update}),[update]);
  useEffect(()=>{
    const token=++generation.current;setVisible([]);
    if(locator)void eligible(locator,active,publication,data.url).then(items=>{if(token===generation.current)setVisible(items)}).catch(()=>{if(token===generation.current)setVisible([])});
    return ()=>{generation.current++};
  },[locator,active,publication,data.url]);
  useEffect(()=>{persist(current.current)},[packages,enabled,persist]);
  useEffect(()=>{if(support)supportHeading.current?.focus()},[support]);
  useEffect(()=>{if(draft)editorHeading.current?.focus()},[!!draft]);
  // Beta.4 changed Redux without changing the underlying Readium layout.
  // Mirror Thorium's StatefulLayout: apply navigator preference first.
  const applyLayout=useCallback((desired:boolean)=>{
    intendedScroll.current=desired;
    modeQueue.current=modeQueue.current.catch(()=>{}).then(async()=>{
      setLayoutBusy(true);
      try{
        const before=getSetting("scroll");
        if(typeof before!=="boolean")throw new Error("The EPUB navigator is not ready.");
        if(before!==desired)await submitPreferences({scroll:desired});
        const actual=getSetting("scroll");
        if(typeof actual!=="boolean")throw new Error("The EPUB navigator did not confirm its layout.");
        dispatch(setScroll(actual));
      }catch(e){
        setMessage("Could not change reading layout: "+errorText(e));
      }finally{
        setLayoutBusy(false);
      }
    });
  },[dispatch,getSetting,submitPreferences]);
  useEffect(()=>{intendedScroll.current=scroll},[scroll]);
  useEffect(()=>{
    if(profile!=="epub"||isFXL||readerLoading)return;
    const surface=readingSurface.current;
    if(!surface)return;
    const observer=new ResizeObserver(entries=>{
      const rect=entries[0]?.contentRect;
      const width=rect?.width??surface.clientWidth;
      const height=rect?.height??surface.clientHeight;
      if(width<=0||height<=0)return;
      const compact=width<840||height<600;
      if(compact===wasCompact.current)return;
      wasCompact.current=compact;
      if(compact&&!intendedScroll.current){
        automaticLayout.current=false;
        applyLayout(true);
      }else if(!compact&&automaticLayout.current!==null){
        const previous=automaticLayout.current;
        automaticLayout.current=null;
        if(intendedScroll.current!==previous)applyLayout(previous);
      }
    });
    observer.observe(surface);
    return ()=>observer.disconnect();
  },[profile,isFXL,readerLoading,applyLayout]);
  function toggleReadingLayout(){
    if(layoutBusy||readerLoading)return;
    automaticLayout.current=null;
    applyLayout(!scroll);
  }
  function closeSupport(){setDraft(null);setPending(null);setSupport(false);supportButton.current?.focus()}
  async function closeBook(){try{await queue.current;onClose()}catch{setMessage("Local save failed. Retry by changing a layer toggle before leaving.")}}
  async function importLayers(){
    try{
      const raw=await invoke<unknown>("import_layers");if(raw===null)return;
      const r=validateOrlPackage(raw);
      // Avoid rendering diagnostics that can include future item labels or identifiers.
      if(!r.valid||!r.package){setMessage("This support file is invalid or uses an unsupported version. You can continue reading.");return}
      if(r.package.publication.identifier!==publication.metadata.identifier){setMessage("This package belongs to a different publication. It was not imported.");return}
      const modified=(publication.metadata as unknown as {modified?:Date|string}).modified;
      if(r.package.publication.modified&&modified&&String(modified)!==r.package.publication.modified){
        setPending(r.package);setMessage("Publication ID matches, but edition dates differ. Review the edition warning below before enabling support.");return;
      }
      attach(r.package);
    }catch(e){setMessage(errorText(e))}
  }
  function attach(pkg:OrlPackage){setPackages(old=>[...old.filter(p=>p.id!==pkg.id),pkg]);setPending(null);setMessage("Support package saved locally. Unresolved locations stay hidden.")}
  function create(){
    if(!locator){setMessage("Wait for the reading position before creating an entry.");return}
    setDraft({type:"people",label:"",text:"",target:plain(locator)});
  }
  function saveDraft(){
    if(!draft?.label.trim()||!draft.text.trim())return;
    const personalId="urn:orl:personal:"+book.id;
    const personal=packages.find(p=>p.id===personalId)??{schemaVersion:"0.1" as const,id:personalId,publication:{identifier:publication.metadata.identifier??"",title:book.title},metadata:{title:"My reading support",language:"en",provenance:"personal" as const,created:new Date().toISOString()},layers:[]};
    const item:OrlItem={id:draft.id??crypto.randomUUID(),label:draft.label.trim(),text:draft.text.trim(),target:{start:draft.target}};
    const layers=personal.layers.map(l=>({...l,items:l.items.filter(i=>i.id!==item.id)}));
    let layer=layers.find(l=>l.type===draft.type);
    if(!layer){layer={id:draft.type,type:draft.type,label:labels[draft.type]??draft.type,items:[]};layers.push(layer)}
    layer.items.push(item);
    const next={...personal,metadata:{...personal.metadata,modified:new Date().toISOString()},layers};
    const r=validateOrlPackage(next);if(!r.valid){setMessage("Could not save this location. Move within the book and capture it again.");return}
    setPackages(old=>[...old.filter(p=>p.id!==personalId),next]);setDraft(null);setMessage("Personal entry saved locally.");
    supportHeading.current?.focus();
  }
  function removeItem(v:Visible){
    setPackages(old=>old.map(p=>p.id!==v.packageId?p:{...p,layers:p.layers.map(l=>({...l,items:l.items.filter(i=>i.id!==v.item.id)}))}));
  }
  return <main className={"reader-app"+(support?" support-open":"")}>
    <header className="app-bar"><button onClick={()=>void closeBook()}>Library</button><strong>{book.title}</strong>
      <span className="save-status" role="status">{saving?"Saving.":"Local reading"}</span>
      {profile==="epub"&&!isFXL&&<button className="layout-mode" type="button" aria-pressed={scroll} disabled={readerLoading||layoutBusy} title={scroll?"Switch to paginated reading":"Switch to vertical scrolling"} onClick={toggleReadingLayout}>{layoutBusy?"Changing view…":scroll?"Scroll view":"Page view"}</button>}
      <button ref={supportButton} aria-expanded={support} aria-controls="support-panel" onClick={()=>support?closeSupport():setSupport(true)}>Reading Support</button></header>
    <div className="reader-body"><section className="reading-surface" ref={readingSurface} aria-label="Book reader">
      <StatefulReaderWrapper profile={profile} publication={publication} localDataKey={"orl-book-"+book.id} positionStorage={positionStorage} preferences={{initialPreferences:readerPreferences}} i18n={{load:"languageOnly"}}/>
    </section>
    {support&&<aside id="support-panel" className="support-panel" aria-labelledby="support-title" onKeyDown={e=>{if(e.key==="Escape"){e.stopPropagation();closeSupport()}}}>
      <header className="panel-header"><h2 id="support-title" tabIndex={-1} ref={supportHeading}>Reading Support</h2><button onClick={closeSupport} aria-label="Close reading support">Close</button></header>
      <p className="muted">Support follows your current reading position. Future entries stay hidden.</p>
      <fieldset><legend>Show layers</legend>{Object.entries(labels).map(([type,label])=><label className="toggle" key={type}><input type="checkbox" checked={!!enabled[type]} onChange={e=>setEnabled(old=>({...old,[type]:e.target.checked}))}/>{label}</label>)}</fieldset>
      <div className="panel-actions"><button onClick={()=>void importLayers()}>Import ORL JSON</button><button onClick={create} disabled={!locator}>Add personal entry here</button></div>
      <p role="status" className="notice">{message}</p>
      {pending&&<section aria-label="Edition mismatch"><p>The package targets a different revision of this publication. Anchor matches cannot guarantee identical story content.</p><button onClick={()=>attach(pending)}>Use this edition anyway</button><button onClick={()=>setPending(null)}>Cancel import</button></section>}
      {draft&&<form onSubmit={e=>{e.preventDefault();saveDraft()}} className="editor">
        <h3 tabIndex={-1} ref={editorHeading}>{draft.id?"Edit personal entry":"New personal entry"}</h3>
        <label>Layer<select value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value})}>{Object.entries(labels).map(([k,v])=><option value={k} key={k}>{v}</option>)}</select></label>
        <label>Label<input maxLength={200} required value={draft.label} onChange={e=>setDraft({...draft,label:e.target.value})}/></label>
        <label>Reminder<textarea required maxLength={20000} rows={5} value={draft.text} onChange={e=>setDraft({...draft,text:e.target.value})}/></label>
        <p>Reveal point: <code>{draft.target.href}</code></p><pre className="anchor">{JSON.stringify(draft.target.locations,null,2)}</pre>
        <button type="button" onClick={()=>locator&&setDraft({...draft,target:plain(locator)})}>Capture current position</button>
        <div className="panel-actions"><button type="submit" className="primary">Save entry</button><button type="button" onClick={()=>{setDraft(null);supportHeading.current?.focus()}}>Cancel</button></div>
      </form>}
      {Object.entries(labels).filter(([type])=>enabled[type]).map(([type,label])=><section className="layer" key={type}><h3>{label}</h3>
        {visible.filter(v=>v.type===type).length===0?<p className="muted">No support available at this location.</p>:<ul>{visible.filter(v=>v.type===type).map(v=><li key={v.packageId+v.item.id}>
          <h4>{v.item.label}</h4><p className="support-text">{v.item.text}</p><span className="badge">{v.provenance}</span>
          {v.provenance==="personal"&&v.packageId==="urn:orl:personal:"+book.id&&<div className="panel-actions"><button onClick={()=>setDraft({id:v.item.id,type:v.type,label:v.item.label,text:v.item.text,target:v.item.target.start})}>Edit</button><button onClick={()=>removeItem(v)}>Delete</button></div>}
        </li>)}</ul>}
      </section>)}
      <section className="package-list"><h3>Local packages</h3>{packages.length===0&&<p>No support package loaded. Reading works normally.</p>}
        {packages.map(pkg=><div className="package" key={pkg.id}>
          <p>{pkg.metadata.provenance} support package</p>
          <button onClick={async()=>{try{if(await invoke<boolean>("export_layers",{package:pkg}))setMessage("ORL JSON exported.")}catch(e){setMessage(errorText(e))}}}>Export {pkg.metadata.provenance} JSON</button>
          <button className="quiet" onClick={()=>{if(window.confirm("Remove this local support package? Export first to keep a portable copy."))setPackages(old=>old.filter(p=>p.id!==pkg.id))}}>Remove package</button>
        </div>)}</section>
      <p className="muted">Use the reader toolbar for contents, navigation, text size, spacing and theme. Shift+Tab / Tab moves between controls; Escape closes this panel.</p>
    </aside>}</div>
    {profile==="epub"&&!isFXL&&scroll&&<nav className="chapter-navigation" aria-label="Chapter navigation">
      <button type="button" onClick={()=>goChapter(-1)} disabled={readerLoading||chapterIndex<=0} aria-label="Previous chapter">← Previous chapter</button>
      <span className="chapter-position" aria-live="off">{chapterIndex>=0?`Section ${chapterIndex+1} of ${readingOrder.length}`:"Finding reading position…"}</span>
      <button type="button" onClick={()=>goChapter(1)} disabled={readerLoading||chapterIndex<0||chapterIndex>=readingOrder.length-1} aria-label="Next chapter">Next chapter →</button>
    </nav>}
    {!support&&message&&<button className="status-toast" onClick={()=>setSupport(true)}>{message}</button>}
  </main>;
}

