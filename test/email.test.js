import test from 'node:test';import assert from 'node:assert/strict';import {validateEmail,toRawMime} from '../src/email.js';import {renderReminderBody} from '../src/templates.js';
test('rejects header injection and repeated recipients across delivery fields',()=>{
 assert.throws(()=>validateEmail({to:['a@example.com'],subject:'Hello\r\nBcc: other@example.com'}));
 assert.throws(()=>validateEmail({to:['a@example.com'],bcc:['A@example.com'],subject:'Hello'}));
 assert.throws(()=>validateEmail({subject:'Empty'}));
});
test('escapes user text and emits HTML and text MIME alternatives',()=>{
 const html=renderReminderBody({events:[{title:'<script>',dateTime:'Tomorrow',location:'Example',audience:'All'}]});
 assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));
 const email=validateEmail({to:['a@example.com'],subject:'Example',htmlBody:html,textBody:'Example'});
 const raw=Buffer.from(toRawMime(email),'base64url').toString();assert.ok(raw.includes('text/plain'));assert.ok(raw.includes('text/html'));
});
