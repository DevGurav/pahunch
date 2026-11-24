import type { ExcludedPortal, Portal } from './types.ts';
import { aadhaar, cpgrams, depwd, digilocker, ecourts, eshram, ncs, nsp, passport, rti, udid, voters } from './central.ts';
import { aaplesarkar, mahadbt, msedcl } from './maharashtra.ts';

export const PORTALS: readonly Portal[] = [
  udid,
  depwd,
  cpgrams,
  passport,
  aadhaar,
  digilocker,
  nsp,
  voters,
  ecourts,
  ncs,
  rti,
  eshram,
  aaplesarkar,
  mahadbt,
  msedcl,
];

/**
 * Portals that refused the automated browser. Per docs/decisions/0005-scanning-rules.md we record
 * the refusal and leave them out rather than get around it.
 */
export const EXCLUDED: readonly ExcludedPortal[] = [
  {
    name: 'IRCTC',
    owner: 'Ministry of Railways',
    url: 'https://www.irctc.co.in/nget/train-search',
    reason: 'Connection refused for the automated browser (net::ERR_HTTP2_PROTOCOL_ERROR) on two attempts.',
    checkedOn: '2026-11-24',
  },
  {
    name: 'EPFO member portal',
    owner: 'Employees’ Provident Fund Organisation',
    url: 'https://unifiedportal-mem.epfindia.gov.in/memberinterface/',
    reason: 'Answered with a block page: "The URL you requested has been blocked".',
    checkedOn: '2026-11-24',
  },
  {
    name: 'Income Tax e-filing login',
    owner: 'Income Tax Department',
    url: 'https://eportal.incometax.gov.in/iec/foservices/#/login',
    reason: 'No response to the automated browser within 60 seconds on two attempts. The information site www.incometax.gov.in loaded normally.',
    checkedOn: '2026-11-24',
  },
  {
    name: 'PM-KISAN beneficiary status',
    owner: 'Ministry of Agriculture and Farmers Welfare',
    url: 'https://pmkisan.gov.in/BeneficiaryStatus_New.aspx',
    reason: 'Answered with a block page: "The URL you requested has been blocked".',
    checkedOn: '2026-11-24',
  },
];

export function findPortal(id: string): Portal | undefined {
  return PORTALS.find((p) => p.id === id);
}
