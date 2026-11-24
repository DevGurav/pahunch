import type { Portal } from './types.ts';

export const aaplesarkar: Portal = {
  id: 'aaplesarkar',
  name: 'Aaple Sarkar',
  owner: 'Government of Maharashtra',
  jurisdiction: 'Maharashtra',
  task: 'Reach the citizen login form for state services (certificates, permissions)',
  steps: [{ kind: 'goto', url: 'https://aaplesarkar.mahaonline.gov.in/en' }],
  critical: [
    { label: 'Username field', selector: '#UserName', kind: 'field' },
    { label: 'Password field', selector: '#Password', kind: 'field' },
    { label: 'CAPTCHA field', selector: '#Captcha', kind: 'captcha-field' },
    { label: 'Login button', selector: '#btnLogin', kind: 'button' },
  ],
};

export const mahadbt: Portal = {
  id: 'mahadbt',
  name: 'MahaDBT (scholarships and benefits)',
  owner: 'Government of Maharashtra',
  jurisdiction: 'Maharashtra',
  task: 'Reach the applicant login form',
  steps: [{ kind: 'goto', url: 'https://mahadbt.maharashtra.gov.in/Login/Login' }],
  critical: [
    { label: 'Username field', selector: '#UserName', kind: 'field' },
    { label: 'Password field', selector: '#Password', kind: 'field' },
    { label: 'CAPTCHA field', selector: '#CaptchaInputText', kind: 'captcha-field' },
    { label: 'Login button', selector: '#btnLogin', kind: 'button' },
  ],
};

export const msedcl: Portal = {
  id: 'msedcl',
  name: 'MSEDCL (Mahavitaran): view and pay electricity bill',
  owner: 'Maharashtra State Electricity Distribution Co. Ltd.',
  jurisdiction: 'Maharashtra',
  task: 'View an electricity bill without logging in',
  steps: [{ kind: 'goto', url: 'https://wss.mahadiscom.in/wss/wss?uiActionName=getViewPayBill' }],
  critical: [
    { label: 'Consumer type dropdown', selector: '#consumerType', kind: 'select' },
    { label: 'Consumer number field', selector: '#consumerNo', kind: 'field' },
    { label: 'CAPTCHA field', selector: '#txtInput', kind: 'captcha-field' },
    { label: 'Submit button', selector: '#submitButton', kind: 'button' },
  ],
  notes: 'A state-owned utility rather than a department, included because almost every household in Maharashtra uses it. The page is in Marathi.',
};
