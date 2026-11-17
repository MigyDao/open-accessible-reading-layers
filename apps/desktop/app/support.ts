import type {Locator, Publication} from "@readium/shared";
import {type OrlLocator,type OrlPackage,type OrlItem,validateOrlPackage} from "@open-reading-layers/core";

export type Visible = {packageId:string;provenance:string;type:string;item:OrlItem};
export function packagesForBook(values:unknown,publication:Publication):OrlPackage[]{
  if(!Array.isArray(values))return [];
  return values.flatMap(v=>{
    const result=validateOrlPackage(v);
    return result.package && result.valid && result.package.publication.identifier===publication.metadata.identifier?[result.package]:[];
  });
}
const documents=new Map<string,Promise<Document>>();
async function documentAt(url:string):Promise<Document>{
  let p=documents.get(url);
  if(!p){p=fetch(url).then(async r=>{if(!r.ok)throw Error("Missing anchor resource");return new DOMParser().parseFromString(await r.text(),"text/html")});documents.set(url,p);}
  return p;
}
export function plain(locator:Locator):OrlLocator{
  const s=locator.serialize();return {...s,locations:s.locations??{}} as OrlLocator;
}
export async function reached(current:Locator,target:OrlLocator,pub:Publication,url:string):Promise<boolean|null>{
  const canon=(h:string)=>{try{return new URL(h.split("#")[0]??h,url).href}catch{return ""}};
  const order=pub.readingOrder.items.map(l=>canon(l.href));
  const ci=order.indexOf(canon(current.href)),ti=order.indexOf(canon(target.href));
  if(ci<0||ti<0)return null;
  const fragment=target.locations.fragments?.[0]?.replace(/^#/,"")??target.href.split("#")[1];
  const selector=typeof target.locations.cssSelector==="string"?target.locations.cssSelector:null;
  const needsDom=!!(fragment||selector);
  let doc:Document|undefined,targetNode:Element|null=null;
  if(needsDom){
    try{
      doc=await documentAt(canon(target.href));
      targetNode=fragment?doc.getElementById(fragment):doc.querySelector(selector!);
      if(!targetNode)return null;
    }catch{return null}
  }
  if(ci!==ti)return ci>ti;
  if(needsDom){
    const c=current.serialize();
    const currentSelector=c.locations?.cssSelector;
    const currentFragment=c.locations?.fragments?.[0]?.replace(/^#/,"");
    try{
      const node=typeof currentSelector==="string"?doc!.querySelector(currentSelector):currentFragment?doc!.getElementById(currentFragment):null;
      if(!node||!targetNode)return null;
      if(node===targetNode)return true;
      // A containing ancestor can begin before the reveal point.
      if(node.contains(targetNode))return false;
      return !!(node.compareDocumentPosition(targetNode)&Node.DOCUMENT_POSITION_PRECEDING);
    }catch{return null}
  }
  const c=plain(current).locations;
  if(typeof target.locations.progression==="number"&&typeof c.progression==="number")return c.progression>=target.locations.progression;
  if(typeof target.locations.position==="number"&&typeof c.position==="number")return c.position>=target.locations.position;
  return null;
}
export async function eligible(current:Locator,packages:OrlPackage[],pub:Publication,url:string):Promise<Visible[]>{
  const result:Visible[]=[];
  for(const pkg of packages){
    for(const layer of pkg.layers){
      if(!["people","timeline","reentry"].includes(layer.type))continue;
      for(const item of layer.items){
        if(await reached(current,item.target.start,pub,url)!==true)continue;
        if(layer.type==="reentry"&&item.target.end){
          const end=await reached(current,item.target.end,pub,url);
          if(end===null||end===true)continue;
        }
        result.push({packageId:pkg.id,provenance:pkg.metadata.provenance,type:layer.type,item});
      }
    }
  }return result;
}

