const policy=require('./access-policy');
const MAX_IMAGE_BYTES=1536*1024;
function assertSuper(user){if(!user||user.disabled||!policy.isSuper(user))throw new policy.PolicyError('permission-denied','Only the protected super admin can manage intro pages and global notices.');}
function pageInput(data){
 if(!data||Object.keys(data).some(k=>!['page','title','text','version','imageBase64','removeImage'].includes(k))||!['page1','page2'].includes(data.page)||typeof data.title!=='string'||!data.title.trim()||data.title.trim().length>120||typeof data.text!=='string'||data.text.trim().length>3000||!Number.isSafeInteger(data.version)||data.version<0||data.removeImage!==undefined&&typeof data.removeImage!=='boolean'||data.removeImage&&data.imageBase64)throw new policy.PolicyError('invalid-argument','Select page 1 or 2, enter a title and up to 3000 characters, and reload its current version.');
 return {...data,title:data.title.trim(),text:data.text.trim()};
}
function decodeImage(value){
 if(typeof value!=='string'||value.length>Math.ceil(MAX_IMAGE_BYTES/3)*4||!value.length||value.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(value))throw new policy.PolicyError('invalid-argument','Upload a JPEG, PNG or WebP image up to 1.5 MB.');
 const bytes=Buffer.from(value,'base64');
 if(!bytes.length||bytes.length>MAX_IMAGE_BYTES)throw new policy.PolicyError('invalid-argument','Image exceeds 1.5 MB.');
 let type;
 if(bytes.length>12&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)type='jpeg';
 else if(bytes.length>24&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))type='png';
 else if(bytes.length>12&&bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')type='webp';
 if(!type)throw new policy.PolicyError('invalid-argument','Only JPEG, PNG and WebP images are supported.');
 return {bytes,type,contentType:`image/${type}`};
}
module.exports={assertSuper,pageInput,decodeImage,MAX_IMAGE_BYTES};
