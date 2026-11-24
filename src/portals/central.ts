import type { Portal } from './types.ts';

// Selectors were taken from `npm run discover` on 2026-11-24. Where a control had no stable id,
// the selector uses visible text or a visible attribute such as a placeholder.

export const udid: Portal = {
  id: 'udid',
  name: 'UDID (Unique Disability ID) portal',
  owner: 'Department of Empowerment of Persons with Disabilities',
  jurisdiction: 'Central',
  task: 'Start an application for a disability certificate and UDID card',
  steps: [{ kind: 'goto', url: 'https://swavlambancard.gov.in/Applyforudid' }],
  critical: [
    { label: '"I have read and understood the process" checkbox', selector: '#finalcheck', kind: 'checkbox' },
    { label: 'Submit button', selector: '#content form button:has-text("Submit")', kind: 'button' },
  ],
  notes: 'The portal disabled people must use to get a disability certificate. The application form itself opens only after Submit, which we do not press.',
};

export const depwd: Portal = {
  id: 'depwd',
  name: 'Department of Empowerment of Persons with Disabilities',
  owner: 'Ministry of Social Justice and Empowerment',
  jurisdiction: 'Central',
  task: 'Find the Public Grievance page from the home page',
  steps: [{ kind: 'goto', url: 'https://depwd.gov.in/en/' }],
  critical: [{ label: 'Public Grievance link', selector: 'a[href*="public-grievance"]', kind: 'link' }],
  notes: 'The department responsible for accessibility policy. Its default home page is in Hindi; this task uses the English one. The Public Grievance link sits in a drop-down sub-menu that is closed when the page loads.',
};

export const cpgrams: Portal = {
  id: 'cpgrams',
  name: 'CPGRAMS (public grievance portal)',
  owner: 'Department of Administrative Reforms and Public Grievances',
  jurisdiction: 'Central',
  task: 'Reach the sign-in form needed to lodge a grievance',
  steps: [{ kind: 'goto', url: 'https://pgportal.gov.in/Signin' }],
  critical: [
    { label: 'Mobile / email / username field', selector: '#Username', kind: 'field' },
    { label: 'Password field', selector: '#TempPassword', kind: 'field' },
    { label: 'Security code (CAPTCHA) field', selector: '#Captcha', kind: 'captcha-field' },
    { label: 'Audio CAPTCHA button', selector: '#btnCaptchaAudio', kind: 'captcha-audio' },
    { label: 'Login button', selector: '#btnSubmit', kind: 'button' },
  ],
};

export const passport: Portal = {
  id: 'passport',
  name: 'Passport Seva',
  owner: 'Ministry of External Affairs',
  jurisdiction: 'Central',
  task: 'Reach the login form',
  steps: [{ kind: 'goto', url: 'https://services1.passportindia.gov.in/forms/PreLogin' }],
  critical: [
    { label: 'Login ID field', selector: 'input[data-testid="text-input-outlined"]', kind: 'field' },
    { label: 'Continue button', selector: 'div[tabindex="0"]:has-text("Continue") >> nth=-1', kind: 'button' },
  ],
  notes: 'The Login button on www.passportindia.gov.in/psp leads here. The password and any CAPTCHA appear only after Continue, which we do not press.',
};

export const aadhaar: Portal = {
  id: 'aadhaar',
  name: 'myAadhaar',
  owner: 'Unique Identification Authority of India',
  jurisdiction: 'Central',
  task: 'Reach the Login button on the myAadhaar home page',
  steps: [{ kind: 'goto', url: 'https://myaadhaar.uidai.gov.in/' }],
  critical: [{ label: 'Login button', selector: 'button:has-text("Login") >> visible=true', kind: 'button' }],
  notes: 'During discovery this address sometimes redirected to a beta site (myaadhaarbeta.uidai.gov.in) that was dimmed by an overlay on load. The audit checks whichever version the address serves; the page actually checked is listed below. The login form opens only after Login is pressed, which is out of scope.',
};

export const digilocker: Portal = {
  id: 'digilocker',
  name: 'DigiLocker',
  owner: 'Ministry of Electronics and Information Technology',
  jurisdiction: 'Central',
  task: 'Reach the sign-up form',
  steps: [{ kind: 'goto', url: 'https://www.digilocker.gov.in/web/signup' }],
  critical: [
    { label: 'Mobile number field', selector: '#mobile', kind: 'field' },
    { label: 'Continue button', selector: '#button', kind: 'button' },
  ],
  notes: 'Redirects to accounts.digilocker.gov.in.',
};

export const nsp: Portal = {
  id: 'nsp',
  name: 'National Scholarship Portal',
  owner: 'Ministry of Electronics and Information Technology (NeGD)',
  jurisdiction: 'Central',
  task: 'Reach the first step of the student login',
  steps: [{ kind: 'goto', url: 'https://scholarships.gov.in/otrapplication/#/login-page' }],
  critical: [
    { label: 'First consent checkbox', selector: '#myCheck1', kind: 'checkbox' },
    { label: 'Second consent checkbox', selector: '#myCheck2', kind: 'checkbox' },
    { label: 'Next button', selector: '#step-btn-one', kind: 'button' },
  ],
  notes: 'The login is a multi-step wizard. Its CAPTCHAs (images with empty alt text) appear only in later steps, which need the boxes ticked first, so they are out of reach for this audit.',
};

export const voters: Portal = {
  id: 'voters',
  name: "Voters' Services Portal: electoral roll search",
  owner: 'Election Commission of India',
  jurisdiction: 'Central',
  task: 'Search the electoral roll by EPIC (voter ID) number',
  steps: [{ kind: 'goto', url: 'https://electoralsearch.eci.gov.in/' }],
  critical: [
    { label: 'EPIC number field', selector: '#epicID', kind: 'field' },
    // These two have no id. Selecting by the aria-label attribute is fine here: the checks read the
    // computed name and role from the browser, not from this selector.
    { label: 'State dropdown', selector: 'select[aria-label="Select State"] >> visible=true', kind: 'select' },
    { label: 'CAPTCHA field', selector: 'input[name="captcha"]', kind: 'captcha-field' },
    { label: 'Listen-to-CAPTCHA icon', selector: 'i[aria-label="listen captcha" i]', kind: 'captcha-audio' },
    { label: 'Search button', selector: 'button:text-is("SEARCH")', kind: 'button' },
  ],
};

export const ecourts: Portal = {
  id: 'ecourts',
  name: 'eCourts services: case status',
  owner: 'eCommittee, Supreme Court of India',
  jurisdiction: 'Central',
  task: 'Look up a case by its CNR number',
  steps: [{ kind: 'goto', url: 'https://services.ecourts.gov.in/ecourtindia_v6/' }],
  critical: [
    { label: 'CNR number field', selector: '#cino', kind: 'field' },
    { label: 'CAPTCHA field', selector: '#fcaptcha_code', kind: 'captcha-field' },
    { label: 'Play CAPTCHA audio link', selector: '#captcha_image_audio_controls > a', kind: 'captcha-audio' },
    { label: 'Search button', selector: '#searchbtn', kind: 'button' },
  ],
};

export const ncs: Portal = {
  id: 'ncs',
  name: 'National Career Service',
  owner: 'Ministry of Labour and Employment',
  jurisdiction: 'Central',
  task: 'Reach the job search form',
  steps: [
    { kind: 'goto', url: 'https://www.ncs.gov.in/' },
    // A keyboard user would Tab to this Close button and press Enter.
    { kind: 'click', selector: '#myModal button[aria-label="Close"]', why: 'Close the announcement dialog that opens on load' },
  ],
  notes: 'An announcement dialog opens on load and holds keyboard focus, as a modal should. The audit closes it first, as a user would.',
  critical: [
    { label: 'Jobs / skills / designation field', selector: 'input[placeholder="Enter jobs/skills/designation"]', kind: 'field' },
    { label: 'City field', selector: 'input[placeholder="Enter City"]', kind: 'field' },
    { label: 'Search Jobs button', selector: 'button:has-text("Search Jobs")', kind: 'button' },
  ],
};

export const rti: Portal = {
  id: 'rti',
  name: 'RTI Online',
  owner: 'Department of Personnel and Training',
  jurisdiction: 'Central',
  task: 'Reach the citizen login form for filing an RTI request',
  steps: [{ kind: 'goto', url: 'https://rtionline.gov.in/login.php' }],
  critical: [
    { label: 'Username field', selector: '#UserName', kind: 'field' },
    { label: 'Password field', selector: '#password', kind: 'field' },
    { label: 'CAPTCHA field', selector: 'input.captchaInput', kind: 'captcha-field' },
    { label: 'Audio CAPTCHA link', selector: 'a:has(img[src*="peaker" i]), a:has(img[alt*="speaker" i])', kind: 'captcha-audio' },
    { label: 'Submit button', selector: '#Login', kind: 'button' },
  ],
};

export const eshram: Portal = {
  id: 'eshram',
  name: 'e-Shram: self-registration',
  owner: 'Ministry of Labour and Employment',
  jurisdiction: 'Central',
  task: 'Start registering as an unorganised worker',
  steps: [{ kind: 'goto', url: 'https://register.eshram.gov.in/#/user/self' }],
  critical: [
    { label: 'Mobile number field', selector: '#mobileNumber', kind: 'field' },
    { label: 'CAPTCHA field', selector: '#inputCaptcha', kind: 'captcha-field' },
    { label: 'Send OTP button', selector: 'input[type="submit"][value="Send OTP"]', kind: 'button' },
  ],
};
