const stages=['Found','Checked','Contacted','Interested','Registered','Trial active','Renewed','Declined'];
function trialEnd(start){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start||''))throw Error('Choose a valid trial start date.');
 const d=new Date(start+'T00:00:00Z');if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==start)throw Error('Invalid date.');
 const day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+2);
 const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d.toISOString().slice(0,10);
}
function validate(raw){
 const p={};for(const k of ['id','placeId','name','area','type','contact','evidence','notes','reference','trialStart','followUp','stage','draft','websiteCheck'])p[k]=String(raw[k]||'').trim().slice(0,k==='draft'?5000:1000);
 if(!p.name)throw Error('Enter the business name confirmed by you or its owner.');
 if(!stages.includes(p.stage))throw Error('Choose a valid stage.');
 if(!['Unknown','Website found','No website confirmed'].includes(p.websiteCheck))throw Error('Choose a website check result.');
 p.reviewed=raw.reviewed===true;if(!p.reviewed)throw Error('Confirm these details were independently checked with the owner or another permitted source.');
 if(p.websiteCheck==='No website confirmed'&&!p.evidence)throw Error('Record how you confirmed there is no website.');
 if(['Registered','Trial active','Renewed'].includes(p.stage)&&!/^BHF-[A-Z0-9-]+$/.test(p.reference))throw Error('Record the existing registration reference.');
 p.trialEnd=p.trialStart?trialEnd(p.trialStart):'';
 if(p.stage==='Trial active'&&!p.trialStart)throw Error('Choose the agreed trial start date.');
 if(p.followUp)trialEnd(p.followUp);
 return p;
}
function offer(p){return `Bula ${p.name},\n\nI’m contacting you from Business Hub Fiji. We would like to offer your business a free business website for two months, with your approved products or services also listed in our online mall.\n\nYou approve your business information, photos and listings before publication. After the two-month trial, you can choose a paid website plan at the price shown on our Plans page, or decline to continue. This invitation does not enrol or charge you.\n\nWould you like us to help you get started? Register at https://business-hub-fiji.vercel.app/register and view plans at https://business-hub-fiji.vercel.app/plans.\n\nIf you are not interested, let us know and we will stop following up.\nBusiness Hub Fiji`;}
module.exports={stages,trialEnd,validate,offer};
