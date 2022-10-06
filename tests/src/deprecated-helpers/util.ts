// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

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
