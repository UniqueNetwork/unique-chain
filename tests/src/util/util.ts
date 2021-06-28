//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

export function strToUTF16(str: string): any {
  const buf: number[] = [];
  for (let i=0, strLen=str.length; i < strLen; i++) {
    buf.push(str.charCodeAt(i));
  }
  return buf;
}

export function utf16ToStr(buf: number[]): string {
  let str = '';
  for (let i=0, strLen=buf.length; i < strLen; i++) {
    if (buf[i] != 0) str += String.fromCharCode(buf[i]);
    else break;
  }
  return str;
}

export function hexToStr(buf: string): string {
  let str = '';
  let hexStart = buf.indexOf('0x');
  if (hexStart < 0) hexStart = 0;
  else hexStart = 2;  
  for (let i=hexStart, strLen=buf.length; i < strLen; i+=2) {
    const ch = buf[i] + buf[i+1];
    const num = parseInt(ch, 16);
    if (num != 0) str += String.fromCharCode(num);
    else break;
  }
  return str;
}
