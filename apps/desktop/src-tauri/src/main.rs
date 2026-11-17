#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use lol_html::{element, rewrite_str, RewriteStrSettings};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::{Cursor, Read, Write},
    path::{Path, PathBuf},
};
use tauri::Manager;
use zip::{write::SimpleFileOptions, ZipArchive, ZipWriter};

const LIMIT: u64 = 512 * 1024 * 1024;
fn root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("library");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}
fn valid_id(id: &str) -> Result<(), String> {
    if id.len() == 64 && id.bytes().all(|b| b.is_ascii_hexdigit()) {
        Ok(())
    } else {
        Err("Invalid book identifier".into())
    }
}
fn file(dir: &Path, id: &str, ext: &str) -> Result<PathBuf, String> {
    valid_id(id)?;
    Ok(dir.join(format!("{id}.{ext}")))
}
fn atomic(path: &Path, value: &Value) -> Result<(), String> {
    let data = serde_json::to_vec_pretty(value).map_err(|e| e.to_string())?;
    if data.len() > 8 * 1024 * 1024 {
        return Err("Local support/state exceeds 8 MB".into());
    }
    let temp = path.with_extension("tmp");
    fs::write(&temp, data).map_err(|e| e.to_string())?;
    fs::rename(temp, path).map_err(|e| e.to_string())
}
fn read_json(path: &Path) -> Value {
    fs::read(path)
        .ok()
        .and_then(|v| serde_json::from_slice(&v).ok())
        .unwrap_or(Value::Null)
}
fn entry(zip: &mut ZipArchive<Cursor<Vec<u8>>>, name: &str) -> Result<Vec<u8>, String> {
    let mut f = zip
        .by_name(name)
        .map_err(|_| "Missing EPUB resource".to_string())?;
    if f.size() > 32 * 1024 * 1024 {
        return Err("EPUB resource exceeds 32 MB".into());
    }
    let mut out = Vec::new();
    f.by_ref()
        .take(32 * 1024 * 1024 + 1)
        .read_to_end(&mut out)
        .map_err(|e| e.to_string())?;
    if out.len() > 32 * 1024 * 1024 {
        return Err("EPUB resource exceeds 32 MB".into());
    }
    Ok(out)
}
fn text_entry(zip: &mut ZipArchive<Cursor<Vec<u8>>>, name: &str) -> Result<String, String> {
    String::from_utf8(entry(zip, name)?).map_err(|_| "EPUB text is not UTF-8".into())
}
fn resolve(base: &str, href: &str) -> Result<String, String> {
    if href.contains(':') || href.starts_with('/') || href.contains('\\') {
        return Err("External or unsafe EPUB reference".into());
    }
    let decoded = percent_encoding::percent_decode_str(href)
        .decode_utf8()
        .map_err(|e| e.to_string())?;
    let mut parts: Vec<&str> = base.split('/').filter(|s| !s.is_empty()).collect();
    for p in decoded.split('/') {
        match p {
            "" | "." => {}
            ".." => {
                if parts.pop().is_none() {
                    return Err("Unsafe EPUB reference".into());
                }
            }
            _ => parts.push(p),
        }
    }
    Ok(parts.join("/"))
}
fn node_text(node: roxmltree::Node) -> String {
    node.descendants()
        .filter_map(|n| n.text().filter(|_| n.is_text()))
        .collect::<Vec<_>>()
        .join("")
        .trim()
        .to_string()
}
fn toc_nodes(list: roxmltree::Node, base: &str) -> Vec<Value> {
    list.children().filter(|n|n.has_tag_name("li")).filter_map(|li|{
        let a=li.children().find(|n|n.has_tag_name("a"))?;
        let href=resolve(base,a.attribute("href")?).ok()?;
        let children=li.children().find(|n|n.has_tag_name("ol")).map(|n|toc_nodes(n,base)).unwrap_or_default();
        Some(json!({"href":href,"title":node_text(a),"type":"application/xhtml+xml","children":children}))
    }).collect()
}
fn inspect(bytes: Vec<u8>) -> Result<Value, String> {
    if bytes.len() as u64 > LIMIT {
        return Err("EPUB exceeds 512 MB".into());
    }
    let mut z =
        ZipArchive::new(Cursor::new(bytes)).map_err(|_| "Not a readable EPUB ZIP".to_string())?;
    if z.len() > 20000 {
        return Err("EPUB has too many resources".into());
    }
    let mut total = 0u64;
    for i in 0..z.len() {
        total = total.saturating_add(z.by_index(i).map_err(|e| e.to_string())?.size());
    }
    if total > LIMIT {
        return Err("Expanded EPUB exceeds 512 MB".into());
    }
    let container = text_entry(&mut z, "META-INF/container.xml")?;
    let doc = roxmltree::Document::parse(&container).map_err(|e| e.to_string())?;
    let opf_path = doc
        .descendants()
        .find(|n| n.has_tag_name("rootfile"))
        .and_then(|n| n.attribute("full-path"))
        .ok_or("EPUB package not found")?;
    let opf_path = resolve("", opf_path)?;
    let opf = text_entry(&mut z, &opf_path)?;
    let d = roxmltree::Document::parse(&opf).map_err(|e| e.to_string())?;
    let pkg = d.root_element();
    let uid = pkg.attribute("unique-identifier").unwrap_or("");
    let ident = d
        .descendants()
        .find(|n| n.has_tag_name("identifier") && n.attribute("id") == Some(uid))
        .or_else(|| d.descendants().find(|n| n.has_tag_name("identifier")))
        .map(node_text)
        .unwrap_or_default();
    let title = d
        .descendants()
        .find(|n| n.has_tag_name("title"))
        .map(node_text)
        .unwrap_or_else(|| "Untitled book".into());
    let language = d
        .descendants()
        .find(|n| n.has_tag_name("language"))
        .map(node_text)
        .unwrap_or_else(|| "en".into());
    let modified = d
        .descendants()
        .find(|n| n.has_tag_name("meta") && n.attribute("property") == Some("dcterms:modified"))
        .map(node_text);
    let base = opf_path.rsplit_once('/').map(|v| v.0).unwrap_or("");
    let mut resources = Vec::new();
    let mut ids = std::collections::HashMap::new();
    let mut nav_path = None;
    for n in d.descendants().filter(|n| n.has_tag_name("item")) {
        let Some(href) = n.attribute("href") else {
            continue;
        };
        let Ok(path) = resolve(base, href) else {
            continue;
        };
        let media = n
            .attribute("media-type")
            .unwrap_or("application/octet-stream");
        // No script resources are exposed by the publication protocol.
        if media.contains("javascript") {
            continue;
        }
        let link = json!({"href":path,"type":media});
        if let Some(id) = n.attribute("id") {
            ids.insert(id.to_string(), link.clone());
        }
        if n.attribute("properties")
            .unwrap_or("")
            .split_whitespace()
            .any(|p| p == "nav")
        {
            nav_path = Some(path.clone())
        }
        resources.push(link);
    }
    let mut order = Vec::new();
    for n in d.descendants().filter(|n| n.has_tag_name("itemref")) {
        if n.attribute("linear") == Some("no") {
            continue;
        }
        if let Some(link) = n.attribute("idref").and_then(|id| ids.get(id)) {
            order.push(link.clone())
        }
    }
    if order.is_empty() {
        return Err("EPUB has no readable spine".into());
    }
    if order
        .iter()
        .any(|v| v["type"] != "application/xhtml+xml" && v["type"] != "text/html")
    {
        return Err("This beta supports EPUB books with an HTML/XHTML spine".into());
    }
    let mut toc = Vec::new();
    if let Some(nav) = nav_path {
        if let Ok(source) = text_entry(&mut z, &nav) {
            if let Ok(nd) = roxmltree::Document::parse(&source) {
                let navbase = nav.rsplit_once('/').map(|v| v.0).unwrap_or("");
                let n = nd
                    .descendants()
                    .find(|n| {
                        n.has_tag_name("nav")
                            && n.attributes().any(|a| {
                                a.name() == "type"
                                    && a.value().split_whitespace().any(|v| v == "toc")
                            })
                    })
                    .or_else(|| nd.descendants().find(|n| n.has_tag_name("nav")));
                if let Some(list) = n.and_then(|n| n.children().find(|n| n.has_tag_name("ol"))) {
                    toc = toc_nodes(list, navbase)
                }
            }
        }
    }
    let title_for = |href: &str| -> Option<String> {
        fn find(t: &[Value], href: &str) -> Option<String> {
            for v in t {
                if v["href"].as_str().unwrap_or("").split('#').next() == Some(href) {
                    return v["title"].as_str().map(String::from);
                }
                if let Some(a) = v["children"].as_array() {
                    if let Some(s) = find(a, href) {
                        return Some(s);
                    }
                }
            }
            None
        }
        find(&toc, href)
    };
    for v in &mut order {
        if let Some(t) = title_for(v["href"].as_str().unwrap_or("")) {
            v["title"] = json!(t)
        }
    }
    if toc.is_empty() {
        toc = order.clone()
    }
    let mut positions = Vec::new();
    for link in &order {
        let path = link["href"].as_str().unwrap_or("");
        let size = z.by_name(path).map(|f| f.size()).unwrap_or(0);
        let count = (size / 1500).clamp(1, 500) as usize;
        for i in 0..count {
            positions.push(json!({"href":path,"type":link["type"],"locations":{"progression":i as f64/count as f64,"position":positions.len()+1}}))
        }
    }
    let n = positions.len();
    for (i, p) in positions.iter_mut().enumerate() {
        p["locations"]["totalProgression"] = json!(i as f64 / n as f64)
    }
    Ok(
        json!({"metadata":{"@type":"http://schema.org/Book","identifier":ident,"title":title,"language":[language],"modified":modified},
        "readingOrder":order,"resources":resources,"toc":toc,"positions":positions}),
    )
}
fn import_bytes(dir: &Path, bytes: Vec<u8>) -> Result<String, String> {
    let publication = inspect(bytes.clone())?;
    let id = format!("{:x}", Sha256::digest(&bytes));
    let p = file(dir, &id, "epub")?;
    if !p.exists() {
        fs::write(&p, bytes).map_err(|e| e.to_string())?;
        atomic(&file(dir, &id, "book.json")?, &publication)?;
    }
    Ok(id)
}
fn demo(dir: &Path) -> Result<(), String> {
    if dir.join("initialized").exists() {
        return Ok(());
    }
    let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
    macro_rules! add {
        ($name:literal,$src:literal) => {{
            writer
                .start_file(
                    $name,
                    SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored),
                )
                .map_err(|e| e.to_string())?;
            writer
                .write_all(include_bytes!($src))
                .map_err(|e| e.to_string())?;
        }};
    }
    add!("mimetype", "../../../../examples/demo-book/src/mimetype");
    add!(
        "META-INF/container.xml",
        "../../../../examples/demo-book/src/META-INF/container.xml"
    );
    add!(
        "EPUB/package.opf",
        "../../../../examples/demo-book/src/EPUB/package.opf"
    );
    add!(
        "EPUB/nav.xhtml",
        "../../../../examples/demo-book/src/EPUB/nav.xhtml"
    );
    add!(
        "EPUB/styles.css",
        "../../../../examples/demo-book/src/EPUB/styles.css"
    );
    add!(
        "EPUB/chapter-01.xhtml",
        "../../../../examples/demo-book/src/EPUB/chapter-01.xhtml"
    );
    add!(
        "EPUB/chapter-02.xhtml",
        "../../../../examples/demo-book/src/EPUB/chapter-02.xhtml"
    );
    add!(
        "EPUB/chapter-03.xhtml",
        "../../../../examples/demo-book/src/EPUB/chapter-03.xhtml"
    );
    add!(
        "EPUB/chapter-04.xhtml",
        "../../../../examples/demo-book/src/EPUB/chapter-04.xhtml"
    );
    add!(
        "EPUB/images/water-line.svg",
        "../../../../examples/demo-book/src/EPUB/images/water-line.svg"
    );
    let bytes = writer.finish().map_err(|e| e.to_string())?.into_inner();
    let id = import_bytes(dir, bytes)?;
    let support: Value = serde_json::from_str(include_str!(
        "../../../../examples/demo-book/the-water-line.orl.json"
    ))
    .map_err(|e| e.to_string())?;
    atomic(&file(dir, &id, "layers.json")?, &json!([support]))?;
    fs::write(dir.join("initialized"), b"1").map_err(|e| e.to_string())?;
    Ok(())
}
#[tauri::command]
fn list_books(app: tauri::AppHandle) -> Result<Value, String> {
    let dir = root(&app)?;
    demo(&dir)?;
    let mut books = Vec::new();
    for f in fs::read_dir(&dir).map_err(|e| e.to_string())?.flatten() {
        let name = f.file_name().to_string_lossy().to_string();
        if let Some(id) = name.strip_suffix(".book.json") {
            let v = read_json(&f.path());
            books.push(json!({"id":id,"title":v["metadata"]["title"],"identifier":v["metadata"]["identifier"]}));
        }
    }
    Ok(json!(books))
}
#[tauri::command]
async fn import_book(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let Some(p) = rfd::AsyncFileDialog::new()
        .add_filter("DRM-free EPUB", &["epub"])
        .pick_file()
        .await
    else {
        return Ok(None);
    };
    let path = p.path();
    if fs::metadata(path).map_err(|e| e.to_string())?.len() > LIMIT {
        return Err("EPUB exceeds 512 MB".into());
    }
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    Ok(Some(import_bytes(&root(&app)?, bytes)?))
}
#[tauri::command]
fn open_book(app: tauri::AppHandle, id: String) -> Result<Value, String> {
    let dir = root(&app)?;
    if !file(&dir, &id, "epub")?.exists() {
        return Err("Book copy is unavailable".into());
    }
    Ok(
        json!({"url":format!("http://orl.localhost/{id}/manifest.json"),"state":read_json(&file(&dir,&id,"state.json")?),"packages":read_json(&file(&dir,&id,"layers.json")?)}),
    )
}
#[tauri::command]
fn save_book(
    app: tauri::AppHandle,
    id: String,
    state: Value,
    packages: Value,
) -> Result<(), String> {
    let dir = root(&app)?;
    if !file(&dir, &id, "epub")?.exists() {
        return Err("Book is no longer in the library".into());
    }
    atomic(&file(&dir, &id, "state.json")?, &state)?;
    atomic(&file(&dir, &id, "layers.json")?, &packages)
}
#[tauri::command]
fn remove_book(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let dir = root(&app)?;
    for ext in ["epub", "book.json", "state.json", "layers.json"] {
        let p = file(&dir, &id, ext)?;
        if p.exists() {
            fs::remove_file(p).map_err(|e| e.to_string())?
        }
    }
    Ok(())
}
#[tauri::command]
async fn import_layers() -> Result<Option<Value>, String> {
    let Some(p) = rfd::AsyncFileDialog::new()
        .add_filter("ORL JSON", &["json"])
        .pick_file()
        .await
    else {
        return Ok(None);
    };
    if fs::metadata(p.path()).map_err(|e| e.to_string())?.len() > 8 * 1024 * 1024 {
        return Err("ORL file exceeds 8 MB".into());
    }
    let bytes = fs::read(p.path()).map_err(|e| e.to_string())?;
    serde_json::from_slice(&bytes)
        .map(Some)
        .map_err(|_| "Invalid JSON; reading is unaffected".into())
}
#[tauri::command]
async fn export_layers(package: Value) -> Result<bool, String> {
    let Some(p) = rfd::AsyncFileDialog::new()
        .set_file_name("reading-support.orl.json")
        .add_filter("ORL JSON", &["json"])
        .save_file()
        .await
    else {
        return Ok(false);
    };
    atomic(p.path(), &package)?;
    Ok(true)
}
fn sanitize(source: &str) -> Result<String, String> {
    rewrite_str(source,RewriteStrSettings{element_content_handlers:vec![
        element!("script, iframe, frame, object, embed, base, form, input, button, textarea, select, link[rel=import], meta[http-equiv]",|el|{el.remove();Ok(())}),
        element!("*",|el|{
            let names:Vec<String>=el.attributes().iter().filter_map(|a|{
                let n=a.name();let v=a.value().trim().to_ascii_lowercase();
                if n.to_ascii_lowercase().starts_with("on")||n=="srcdoc"||((n=="href"||n=="src"||n=="xlink:href"||n=="action")&&(v.contains(':')||v.starts_with("//"))){Some(n.to_string())}else{None}
            }).collect();
            for n in names{el.remove_attribute(&n)}Ok(())
        })
    ],..RewriteStrSettings::default()}).map_err(|e|e.to_string())
}
fn serve(app: &tauri::AppHandle, uri: &tauri::http::Uri) -> Result<(Vec<u8>, String), String> {
    let path = percent_encoding::percent_decode_str(uri.path())
        .decode_utf8()
        .map_err(|e| e.to_string())?;
    let mut parts = path.trim_start_matches('/').splitn(2, '/');
    let id = parts.next().ok_or("No book")?;
    valid_id(id)?;
    let name = parts.next().ok_or("No resource")?;
    let dir = root(app)?;
    let meta = read_json(&file(&dir, id, "book.json")?);
    if name == "manifest.json" {
        let mut manifest = meta.clone();
        manifest
            .as_object_mut()
            .ok_or("Missing manifest")?
            .remove("positions");
        manifest["links"] = json!([{"rel":"self","href":format!("http://orl.localhost/{id}/manifest.json"),"type":"application/webpub+json"},{"rel":"http://readium.org/position-list","href":"positions.json","type":"application/vnd.readium.position-list+json"}]);
        return Ok((
            serde_json::to_vec(&manifest).map_err(|e| e.to_string())?,
            "application/webpub+json".into(),
        ));
    }
    if name == "positions.json" {
        return Ok((serde_json::to_vec(&json!({"total":meta["positions"].as_array().map(|a|a.len()).unwrap_or(0),"positions":meta["positions"]})).map_err(|e|e.to_string())?,"application/vnd.readium.position-list+json".into()));
    }
    let allowed = meta["resources"].as_array().ok_or("Missing resources")?;
    let item = allowed
        .iter()
        .find(|v| v["href"].as_str() == Some(name))
        .ok_or("Resource is not in the EPUB manifest")?;
    let mime = item["type"]
        .as_str()
        .unwrap_or("application/octet-stream")
        .to_string();
    if mime.contains("javascript") {
        return Err("Publication scripts are disabled".into());
    }
    let bytes = fs::read(file(&dir, id, "epub")?).map_err(|e| e.to_string())?;
    let mut zip = ZipArchive::new(Cursor::new(bytes)).map_err(|e| e.to_string())?;
    let data = entry(&mut zip, name)?;
    if mime.contains("html") || mime == "image/svg+xml" {
        let s = String::from_utf8(data).map_err(|e| e.to_string())?;
        return Ok((sanitize(&s)?.into_bytes(), mime));
    }
    Ok((data, mime))
}
fn main() {
    tauri::Builder::default()
        .register_uri_scheme_protocol("orl",|context,request|{
            let result=serve(context.app_handle(),request.uri());
            let (status,data,mime)=match result{Ok((d,m))=>(200,d,m),Err(_)=>(404,b"Publication resource unavailable".to_vec(),"text/plain".into())};
            tauri::http::Response::builder().status(status)
                .header("Content-Type",mime)
                .header("Access-Control-Allow-Origin","http://tauri.localhost")
                .header("X-Content-Type-Options","nosniff")
                .header("Content-Security-Policy","default-src 'none'; img-src http://orl.localhost data: blob:; style-src http://orl.localhost http://tauri.localhost 'unsafe-inline'; font-src http://orl.localhost http://tauri.localhost data:; script-src http://tauri.localhost 'unsafe-inline'; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'")
                .body(data).unwrap()
        })
        .invoke_handler(tauri::generate_handler![list_books,import_book,open_book,save_book,remove_book,import_layers,export_layers])
        .run(tauri::generate_context!()).expect("Unable to run ORL");
}
