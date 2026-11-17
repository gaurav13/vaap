-- Website-to-assistant sync columns and the seven management-approved FAQs.
alter table ai_knowledge_sources add column if not exists "syncKey" text;
alter table ai_knowledge_sources add column if not exists "contentHash" text;
alter table ai_knowledge_sources add column if not exists "pendingContent" text;
alter table ai_knowledge_sources add column if not exists "requiresReview" boolean not null default false;
alter table ai_knowledge_sources add column if not exists "lastSyncedAt" timestamp;
alter table ai_knowledge_sources add column if not exists "syncError" text;
create unique index if not exists ai_knowledge_sources_synckey_key on ai_knowledge_sources ("syncKey");

alter table ai_answer_corrections add column if not exists source text not null default '';
alter table ai_answer_corrections add column if not exists audience text not null default 'all';

insert into ai_answer_corrections (question, "correctedAnswer", keywords, variants, "indexedAt", topic, source, audience, status, "createdByName", "reviewedBy", "reviewedAt", "reviewNote")
select v.question, v.answer, v.keywords, v.variants, now(), v.topic, 'VAAP management', v.audience, 'approved', 'VAAP management', 'system:seed', now(), 'Imported from management FAQ brief'
from (values
  ('Can beginners, gold traders, forex traders and USDT users join VAAP?',
   'VAAP welcomes beginners, individual investors, USDT users, traders and professionals interested in the virtual asset industry. Applicants do not need to be experienced cryptocurrency traders. Eligibility, benefits and voting rights depend on the applicable membership category and verification requirements. See [Membership](/membership).',
   'beginner, new, gold trader, forex, usdt, join, eligibility, who can join',
   E'Can a beginner join VAAP?\nI am a gold trader, can I become a member?\nForex traders eligible for membership?\nI only use USDT, can I join?\nکیا نئے لوگ VAAP میں شامل ہو سکتے ہیں؟\nکیا گولڈ یا فاریکس ٹریڈر ممبر بن سکتا ہے؟\nkya beginner VAAP join kar sakta hai\nmain sirf USDT use karta hoon kya member ban sakta hoon',
   'membership', 'all'),
  ('Is VAAP legally registered in Pakistan?',
   'VAAP is currently operating as an industry-led alliance. VAAP management states that its formal registration process is underway with Pakistan''s Ministry of Commerce. Official registration details and the registration number will be published once registration is completed.',
   'registered, registration, legal, ministry of commerce, licence, license, legitimate, SECP',
   E'Is VAAP a registered organisation?\nDoes VAAP have a registration number?\nIs VAAP legal?\nکیا VAAP پاکستان میں رجسٹرڈ ہے؟\nکیا یہ قانونی ادارہ ہے؟\nkya VAAP registered hai\nVAAP legal hai ya nahi',
   'general', 'all'),
  ('Does VAAP provide trading education?',
   'VAAP aims to provide educational resources, awareness sessions, expert discussions and learning opportunities covering blockchain, virtual assets, cybersecurity, investor protection, responsible trading awareness and fintech. Membership does not guarantee professional trading courses, investment advice or trading profits.',
   'education, trading course, learn, training, classes, signals, profit',
   E'Will VAAP teach me how to trade?\nDoes membership include trading courses?\nDoes VAAP give trading signals?\nکیا VAAP ٹریڈنگ سکھاتا ہے؟\nkya VAAP trading sikhata hai\nkya membership mein trading course hai',
   'general', 'all'),
  ('Is VAAP formally affiliated with PVARA?',
   'VAAP is an independent industry alliance, not a regulatory authority. Its objective is to encourage constructive communication between industry stakeholders, policymakers and regulators, including PVARA. Any formal partnership or recognition must be confirmed by official documentation before it is described as established.',
   'PVARA, regulator, affiliated, government, partnership, recognised, approved by',
   E'Is VAAP part of PVARA?\nIs VAAP approved by the government?\nIs VAAP a regulator?\nکیا VAAP کا PVARA سے تعلق ہے؟\nkya VAAP PVARA ka hissa hai\nkya VAAP government approved hai',
   'governance', 'all'),
  ('What personal information does VAAP collect?',
   'Depending on the membership category and verification requirements, VAAP may collect your full name, contact details, email address, phone number, professional or business information, CNIC or other identification details, and NTN information where applicable. For confirmed collection and processing practices, see the [Privacy Policy](/privacy-policy).',
   'personal data, information collected, privacy, data, details required',
   E'What data do you collect from members?\nWhat details do I need to give to join?\nVAAP میری کون سی معلومات لیتا ہے؟\nVAAP kaunsi personal information leta hai',
   'membership', 'all'),
  ('How is CNIC information protected?',
   'VAAP management states that internal security measures have been implemented to protect members'' personal information and restrict unauthorized access. For further information about how your data is handled, contact [VAAP Support](/support).',
   'CNIC, safe, security, protected, encryption, data protection, identity card',
   E'Is my CNIC safe with VAAP?\nWho can see my CNIC?\nکیا میرا شناختی کارڈ محفوظ ہے؟\nmera CNIC safe hai\nCNIC data kaise protect hota hai',
   'membership', 'all'),
  ('Why are CNIC and NTN required for voting?',
   'VAAP''s governance requirements require applicable identity and tax verification for members seeking voting rights. Members who have not completed the required verification cannot exercise voting rights. Voting eligibility also depends on membership category and governance rules, and payment alone does not automatically establish voting eligibility. Check your status on [Voting](/dashboard/voting).',
   'CNIC, NTN, voting, vote, verification, tax, why required',
   E'Why do I need NTN to vote?\nI paid, why can I not vote?\nووٹ کے لیے CNIC اور NTN کیوں ضروری ہے؟\nvote ke liye NTN kyun chahiye\nmaine payment ki phir bhi vote kyun nahi kar sakta',
   'governance', 'members')
) as v(question, answer, keywords, variants, topic, audience)
where not exists (select 1 from ai_answer_corrections c where c.question = v.question);
