const test = require('node:test');
const assert = require('node:assert/strict');
const report = require('../tourism-report');
test('Philippine calendar boundaries and weeks spanning years',()=>{
 assert.equal(report.day('2026-10-22T16:00:00Z'),'2026-10-23');
 assert.equal(report.day('2026-10-22T15:59:59Z'),'2026-10-22');
 assert.deepEqual(report.range('week','2027-01-01'),{from:'2026-12-28',to:'2027-01-03'});
 assert.deepEqual(report.range('month','2028-02-20'),{from:'2028-02-01',to:'2028-02-29'});
});
test('daily totals preserve centavos, group counts and unknown legacy values',()=>{
 const rows=[{createdAt:'2026-10-22T16:00:00Z',touristCount:3,feeTotalCentavos:3003},
 {createdAt:'2026-10-23T00:00:00Z',fee:0.1},{createdAt:'2026-10-22T15:59:59Z'}];
 assert.deepEqual(report.totals(rows),{registrations:3,tourists:3,centavos:3013,unknownCounts:2,unknownFees:1});
 assert.equal(report.daily(rows)[0].registrations,2);assert.equal(report.daily(rows)[0].date,'2026-10-23');
});
