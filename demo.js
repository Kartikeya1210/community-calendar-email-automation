import {mkdirSync,writeFileSync} from 'node:fs';
import {renderReminderBody} from './src/templates.js';import {validateEmail,toRawMime} from './src/email.js';
const events=[{title:'Fictional Community Workshop',dateTime:'October 15, 2026 at 6:00 PM',location:'Example Community Room',audience:'all members',atCenter:false}];
const email=validateEmail({bcc:['member@example.com'],subject:'Demo: community workshop reminder',htmlBody:renderReminderBody({events}),textBody:'Fictional Community Workshop. October 15, 2026 at 6:00 PM. Example Community Room. For all members.'});
mkdirSync('demo-output',{recursive:true});writeFileSync('demo-output/reminder.html',email.htmlBody);writeFileSync('demo-output/reminder.eml',Buffer.from(toRawMime(email),'base64url'));
console.log('Offline preview written to demo-output/reminder.html and reminder.eml. Nothing scheduled or sent.');
