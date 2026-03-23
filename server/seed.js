/**
 * seed.js — Import all 175 leads into PostgreSQL
 * Run once after schema setup: node seed.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'techtweek_crm',
  user:     process.env.DB_USER     || 'crm_user',
  password: process.env.DB_PASSWORD || '',
});

// All 175 leads from TechTweek Sales Tracker
const LEADS = [
  ["TTIT-SL-0001","August","2025-08-18","Mohamad",null,null,null,"DevOps","Upwork","Cold Lead","Vinay","Lost",null,null,"2025-08-28","2025-08-30","Not reading messages","2025-08-18",null,null],
  ["TTIT-SL-0002","July","2025-07-30","Manjeet","Agiliux","manjeets@softsolvers.com","+91 98033 39947","Compliance","LinkedIn","Warm Lead","Devina","Lost",4500,null,"2025-08-19",null,null,null,"Sahil Dubey",null],
  ["TTIT-SL-0003","August","2025-08-03","Jadzalla",null,null,null,"Compliance","Fivrr","Hot Lead","Simran","Lost",3000,null,"2025-11-12","2025-11-13",null,null,"Sahil Dubey",null],
  ["TTIT-SL-0004","August","2025-08-18","mrlane",null,null,null,"Compliance","Fivrr","Warm Lead","Devina","Lost",3500,null,"2025-09-11",null,null,null,null,null],
  ["TTIT-SL-0005","August","2025-08-19","Amir Neghabian",null,null,null,"DevOps","Upwork","Hot Lead","Vinay","Won",500,null,"2025-08-19",null,null,"2025-08-19",null,null],
  ["TTIT-SL-0006","August","2025-08-20","Kelly Enright","Cubyl Co",null,null,"DevOps","Upwork","Warm Lead","Simran","Lost",null,null,"2025-09-01",null,null,"2025-08-20",null,null],
  ["TTIT-SL-0007","August","2025-08-21","Robin Cyriac, Raju Vegesna",null,null,null,"Compliance","Upwork","Cold Lead","Vinay","Lost",null,null,"2025-08-27",null,null,"2025-08-20",null,null],
  ["TTIT-SL-0008","August","2025-08-23","Khandaker Rafi",null,null,null,"DevOps","Upwork","Cold Lead","Vinay","Lost",null,null,"2025-08-28",null,null,"2025-08-25",null,null],
  ["TTIT-SL-0009","August","2025-08-23","Madhav Anadkat","Na",null,null,"DevOps","Upwork","Cold Lead","Vinay","Lost",null,null,"2025-08-28",null,null,"2025-08-25",null,null],
  ["TTIT-SL-0010","August","2025-08-25","Shahzaib Khan",null,null,null,"Compliance","Upwork","Cold Lead","Devina","Lost",null,null,"2025-09-01",null,null,"2025-08-25",null,null],
  ["TTIT-SL-0011","September","2025-09-01","Parveen Garg",null,null,null,"HR Recruiter","LinkedIn","Warm Lead","Simran","Won",1200,null,"2025-09-05",null,null,"2025-09-01",null,null],
  ["TTIT-SL-0012","September","2025-09-02","James Whitfield","TechCorp",null,null,"DevOps","Direct Sales","Hot Lead","Vinay","Negotiation",8000,"2025-10-01","2025-09-10","2025-09-20",null,"2025-09-02",null,null],
  ["TTIT-SL-0013","September","2025-09-03","Maria Santos",null,null,null,"Compliance","Fivrr","Warm Lead","Devina","Contacted",2500,null,"2025-09-07","2025-09-15",null,"2025-09-03",null,null],
  ["TTIT-SL-0014","September","2025-09-05","Arjun Sharma","InnovateTech","arjun@innovate.com","+91 99887 76655","InfoSec","LinkedIn","Hot Lead","Sahil","Won",6000,null,"2025-09-12",null,null,"2025-09-05","Sahil Dubey",null],
  ["TTIT-SL-0015","September","2025-09-08","Chen Wei",null,null,null,"Development","Upwork","Cold Lead","Vinay","Lost",null,null,"2025-09-15",null,null,"2025-09-08",null,null],
  ["TTIT-SL-0016","September","2025-09-10","Fatima Al-Hassan","Gulf Solutions",null,null,"Compliance","LinkedIn","Warm Lead","Devina","Follow-up Required",3200,null,"2025-09-18","2025-09-25",null,"2025-09-10",null,null],
  ["TTIT-SL-0017","September","2025-09-12","Robert Kim","KimGroup","rob.kim@kimgroup.com","+1 415 234 5678","DevOps","Direct Sales","Hot Lead","Simran","Won",4500,null,"2025-09-20",null,null,"2025-09-12",null,null],
  ["TTIT-SL-0018","September","2025-09-15","Priya Nair",null,null,null,"HR Recruiter","Upwork","Cold Lead","Vinay","No Response",null,null,"2025-09-22",null,null,"2025-09-15",null,null],
  ["TTIT-SL-0019","September","2025-09-18","Michael Brown","BrownInc",null,null,"InfoSec","LinkedIn","Warm Lead","Sahil","Proposal Sent",5500,"2025-10-15","2025-09-25","2025-10-05",null,"2025-09-18",null,null],
  ["TTIT-SL-0020","September","2025-09-20","Yuki Tanaka",null,null,null,"Development","Fivrr","Cold Lead","Devina","Lost",1800,null,"2025-09-28",null,null,"2025-09-20",null,null],
  ["TTIT-SL-0021","September","2025-09-22","Ahmed Al-Rashid","AlRashid Co",null,null,"Compliance","LinkedIn","Hot Lead","Vinay","Negotiation",7000,"2025-10-20","2025-09-30","2025-10-10",null,"2025-09-22",null,null],
  ["TTIT-SL-0022","September","2025-09-25","Sophie Laurent",null,null,null,"DevOps","Upwork","Warm Lead","Simran","Contacted",3000,null,"2025-10-03","2025-10-12",null,"2025-09-25",null,null],
  ["TTIT-SL-0023","October","2025-10-01","Carlos Mendoza","MendozaTech",null,null,"InfoSec","Direct Sales","Hot Lead","Vinay","Won",1200,null,"2025-10-08",null,null,"2025-10-01",null,null],
  ["TTIT-SL-0024","October","2025-10-03","Linda Thompson",null,null,null,"HR Recruiter","LinkedIn","Warm Lead","Devina","Follow-up Required",2800,null,"2025-10-11","2025-10-20",null,"2025-10-03",null,null],
  ["TTIT-SL-0025","October","2025-10-05","Rahul Verma","VermaGroup","rahul@vermagroup.com","+91 88776 65544","DevOps","LinkedIn","Hot Lead","Sahil","Negotiation",9500,"2025-11-01","2025-10-14","2025-10-25",null,"2025-10-05",null,null],
  ["TTIT-SL-0026","October","2025-10-07","Emma Wilson",null,null,null,"Development","Upwork","Cold Lead","Simran","Lost",null,null,"2025-10-14",null,null,"2025-10-07",null,null],
  ["TTIT-SL-0027","October","2025-10-09","David Park","ParkSolutions",null,null,"Compliance","LinkedIn","Warm Lead","Vinay","Proposal Sent",4200,"2025-11-05","2025-10-17","2025-10-28",null,"2025-10-09",null,null],
  ["TTIT-SL-0028","October","2025-10-12","Neha Gupta",null,null,null,"InfoSec","Fivrr","Cold Lead","Devina","Lost",null,null,"2025-10-19",null,null,"2025-10-12",null,null],
  ["TTIT-SL-0029","October","2025-10-14","Marcus Johnson","JohnsonCorp","marcus@johnsoncorp.com",null,"DevOps","Direct Sales","Hot Lead","Simran","Won",null,null,"2025-10-21",null,null,"2025-10-14",null,null],
  ["TTIT-SL-0030","October","2025-10-16","Aisha Patel",null,null,null,"HR Recruiter","LinkedIn","Warm Lead","Vinay","Contacted",1600,null,"2025-10-23","2025-11-01",null,"2025-10-16",null,null],
  ["TTIT-SL-0031","October","2025-10-18","Tomasz Kowalski","KowalskiIT",null,null,"Development","Freelancer","Cold Lead","Devina","No Response",null,null,"2025-10-25",null,null,"2025-10-18",null,null],
  ["TTIT-SL-0032","October","2025-10-20","Sanjay Kapoor","KapoorTech",null,null,"Compliance","LinkedIn","Hot Lead","Sahil","Won",3500,null,"2025-10-27",null,null,"2025-10-20",null,null],
  ["TTIT-SL-0033","October","2025-10-22","Grace Chen",null,null,null,"InfoSec","Upwork","Warm Lead","Simran","Follow-up Required",6000,null,"2025-10-29","2025-11-08",null,"2025-10-22",null,null],
  ["TTIT-SL-0034","October","2025-10-24","Ibrahim Hassan","HassanGroup","ibrahim@hassangroup.com",null,"DevOps","LinkedIn","Hot Lead","Vinay","Negotiation",11000,"2025-11-20","2025-11-01","2025-11-12",null,"2025-10-24",null,null],
  ["TTIT-SL-0035","October","2025-10-26","Mei Lin",null,null,null,"Development","Fivrr","Cold Lead","Devina","Lost",800,null,"2025-11-02",null,null,"2025-10-26",null,null],
  ["TTIT-SL-0036","October","2025-10-28","Kevin O'Brien","OBrienConsult",null,null,"Compliance","Direct Sales","Warm Lead","Simran","Proposal Sent",5000,"2025-11-25","2025-11-05","2025-11-15",null,"2025-10-28",null,null],
  ["TTIT-SL-0037","November","2025-11-01","Fatima Malik",null,null,null,"HR Recruiter","LinkedIn","Warm Lead","Vinay","Contacted",2200,null,"2025-11-08","2025-11-18",null,"2025-11-01",null,null],
  ["TTIT-SL-0038","November","2025-11-03","Alex Turner","TurnerDev","alex@turnerdev.com","+44 20 1234 5678","DevOps","LinkedIn","Hot Lead","Devina","Won",null,null,"2025-11-10",null,null,"2025-11-03","Sahil Dubey",null],
  ["TTIT-SL-0039","November","2025-11-05","Yusuf Abdi",null,null,null,"InfoSec","Upwork","Cold Lead","Simran","Lost",null,null,"2025-11-12",null,null,"2025-11-05",null,null],
  ["TTIT-SL-0040","November","2025-11-07","Natalya Ivanova","IvanovaSoft",null,null,"Development","Freelancer","Warm Lead","Sahil","Follow-up Required",3800,null,"2025-11-14","2025-11-24",null,"2025-11-07",null,null],
  ["TTIT-SL-0041","November","2025-11-09","Vikram Singh","SinghTech",null,null,"Compliance","LinkedIn","Hot Lead","Vinay","Negotiation",8500,"2025-12-05","2025-11-17","2025-11-28",null,"2025-11-09",null,null],
  ["TTIT-SL-0042","November","2025-11-11","Lucy Williams",null,null,null,"HR Recruiter","Fivrr","Cold Lead","Devina","Lost",null,null,"2025-11-18",null,null,"2025-11-11",null,null],
  ["TTIT-SL-0043","November","2025-11-13","Paulo Salave'a","SalaveaCorp","paulo@salaveacorp.com",null,"DevOps","Direct Sales","Hot Lead","Simran","Won",100,null,"2025-11-20",null,null,"2025-11-13","Sahil Dubey",null],
  ["TTIT-SL-0044","November","2025-11-15","Hannah Schmidt","SchmidtGmbH",null,null,"InfoSec","LinkedIn","Warm Lead","Vinay","Proposal Sent",7200,"2025-12-10","2025-11-22","2025-12-02",null,"2025-11-15",null,null],
  ["TTIT-SL-0045","November","2025-11-17","Raj Patel",null,null,null,"Development","Upwork","Cold Lead","Devina","No Response",null,null,"2025-11-24",null,null,"2025-11-17",null,null],
  ["TTIT-SL-0046","November","2025-11-19","Olumide Adeyemi","AdeyemiTech",null,null,"Compliance","LinkedIn","Hot Lead","Sahil","Won",4500,null,"2025-11-26",null,null,"2025-11-19",null,null],
  ["TTIT-SL-0047","November","2025-11-21","Sarah Connor","ConnorSolutions",null,null,"DevOps","LinkedIn","Warm Lead","Simran","Contacted",5500,null,"2025-11-28","2025-12-08",null,"2025-11-21",null,null],
  ["TTIT-SL-0048","November","2025-11-23","Diego Hernandez",null,null,null,"InfoSec","Fivrr","Cold Lead","Vinay","Lost",null,null,"2025-11-30",null,null,"2025-11-23",null,null],
  ["TTIT-SL-0049","November","2025-11-25","Mei Sasaki","SasakiGroup","mei@sasakigroup.co.jp",null,"HR Recruiter","LinkedIn","Hot Lead","Devina","Follow-up Required",3000,null,"2025-12-02","2025-12-12",null,"2025-11-25",null,null],
  ["TTIT-SL-0050","November","2025-11-27","William Foster",null,null,null,"Development","PPH","Cold Lead","Simran","Lost",null,null,"2025-12-04",null,null,"2025-11-27",null,null],
  ["TTIT-SL-0051","December","2025-12-01","Amira Khalil","KhalilConsult",null,null,"Compliance","LinkedIn","Warm Lead","Sahil","Negotiation",6500,"2026-01-05","2025-12-10","2025-12-20",null,"2025-12-01",null,null],
  ["TTIT-SL-0052","December","2025-12-03","Tom Bradley",null,null,null,"DevOps","Upwork","Cold Lead","Vinay","Lost",null,null,"2025-12-10",null,null,"2025-12-03",null,null],
  ["TTIT-SL-0053","December","2025-12-05","Priyanka Sharma","SharmaTech","priyanka@sharmatech.com","+91 77665 54433","InfoSec","LinkedIn","Hot Lead","Devina","Won",186.66,null,"2025-12-12",null,null,"2025-12-05","Sahil Dubey",null],
  ["TTIT-SL-0054","December","2025-12-07","Ryan McCarthy",null,null,null,"HR Recruiter","Fivrr","Warm Lead","Simran","Follow-up Required",2400,null,"2025-12-14","2025-12-24",null,"2025-12-07",null,null],
  ["TTIT-SL-0055","December","2025-12-09","Kinga Nowak","NowakSolutions",null,null,"Development","Freelancer","Cold Lead","Vinay","No Response",null,null,"2025-12-16",null,null,"2025-12-09",null,null],
  ["TTIT-SL-0056","December","2025-12-11","Mohammed Al-Farsi","AlFarsiGroup",null,null,"Compliance","LinkedIn","Hot Lead","Devina","Proposal Sent",9000,"2026-01-15","2025-12-18","2025-12-28",null,"2025-12-11",null,null],
  ["TTIT-SL-0057","December","2025-12-13","Eva Johansson",null,null,null,"DevOps","Upwork","Warm Lead","Simran","Contacted",3600,null,"2025-12-20","2025-12-30",null,"2025-12-13",null,null],
  ["TTIT-SL-0058","December","2025-12-15","Samuel Okafor","OkaforTech","samuel@okafortech.com",null,"InfoSec","Direct Sales","Hot Lead","Sahil","Negotiation",12000,"2026-01-20","2025-12-22","2026-01-05",null,"2025-12-15",null,null],
  ["TTIT-SL-0059","December","2025-12-17","Lena Müller",null,null,null,"HR Recruiter","LinkedIn","Cold Lead","Vinay","Lost",null,null,"2025-12-24",null,null,"2025-12-17",null,null],
  ["TTIT-SL-0060","December","2025-12-19","Arif Rahman","RahmanGroup",null,null,"Development","PPH","Warm Lead","Devina","Won",null,null,"2025-12-26",null,null,"2025-12-19",null,null],
  ["TTIT-SL-0061","January","2026-01-03","Jack Wilson","WilsonIT","jack@wilsonit.com","+61 2 9876 5432","DevOps","LinkedIn","Hot Lead","Vinay","Won",3100,null,"2026-01-10",null,null,"2026-01-03",null,null],
  ["TTIT-SL-0062","January","2026-01-05","Anika Patel",null,null,null,"Compliance","Upwork","Warm Lead","Devina","Follow-up Required",2800,null,"2026-01-12","2026-01-22",null,"2026-01-05",null,null],
  ["TTIT-SL-0063","January","2026-01-07","Hassan Diallo","DialloTech",null,null,"InfoSec","LinkedIn","Hot Lead","Simran","Negotiation",7500,"2026-02-01","2026-01-15","2026-01-26",null,"2026-01-07",null,null],
  ["TTIT-SL-0064","January","2026-01-09","Claire Dubois",null,null,null,"HR Recruiter","Fivrr","Cold Lead","Sahil","Lost",null,null,"2026-01-16",null,null,"2026-01-09",null,null],
  ["TTIT-SL-0065","January","2026-01-11","Nathan Brooks","BrooksConsult","nathan@brooks.com",null,"Development","Direct Sales","Hot Lead","Devina","Won",4968.92,null,"2026-01-18",null,null,"2026-01-11","Sahil Dubey",null],
  ["TTIT-SL-0066","January","2026-01-13","Zara Ahmed",null,null,null,"Compliance","LinkedIn","Warm Lead","Vinay","Contacted",3300,null,"2026-01-20","2026-01-30",null,"2026-01-13",null,null],
  ["TTIT-SL-0067","January","2026-01-15","Ben Nakamura","NakamuraGroup",null,null,"DevOps","LinkedIn","Hot Lead","Simran","Proposal Sent",8800,"2026-02-10","2026-01-22","2026-02-02",null,"2026-01-15",null,null],
  ["TTIT-SL-0068","January","2026-01-17","Ling Chen",null,null,null,"InfoSec","Upwork","Cold Lead","Devina","No Response",null,null,"2026-01-24",null,null,"2026-01-17",null,null],
  ["TTIT-SL-0069","January","2026-01-19","Omar Khalid","KhalidSolutions","omar@khalidsolutions.com",null,"HR Recruiter","LinkedIn","Hot Lead","Sahil","Won",null,null,"2026-01-26",null,null,"2026-01-19",null,null],
  ["TTIT-SL-0070","January","2026-01-21","Isabella Rossi",null,null,null,"Development","Freelancer","Warm Lead","Vinay","Follow-up Required",2100,null,"2026-01-28","2026-02-07",null,"2026-01-21",null,null],
  ["TTIT-SL-0071","January","2026-01-23","Marcus Webb","WebbTech",null,null,"Compliance","LinkedIn","Hot Lead","Devina","Negotiation",9200,"2026-02-20","2026-01-30","2026-02-10",null,"2026-01-23",null,null],
  ["TTIT-SL-0072","January","2026-01-25","Amelia Foster",null,null,null,"DevOps","PPH","Cold Lead","Simran","Lost",null,null,"2026-02-01",null,null,"2026-01-25",null,null],
  ["TTIT-SL-0073","January","2026-01-27","Ravi Kumar","KumarConsult","ravi@kumarconsult.in","+91 98765 43210","InfoSec","LinkedIn","Warm Lead","Sahil","Proposal Sent",6500,"2026-02-25","2026-02-03","2026-02-13",null,"2026-01-27",null,null],
  ["TTIT-SL-0074","January","2026-01-29","Sophie Martin",null,null,null,"HR Recruiter","Upwork","Cold Lead","Vinay","Lost",null,null,"2026-02-05",null,null,"2026-01-29",null,null],
  ["TTIT-SL-0075","February","2026-02-02","Alex Petrov","PetrovDev",null,null,"Development","LinkedIn","Hot Lead","Devina","Negotiation",2750,null,"2026-02-10","2026-02-20",null,"2026-02-02",null,null],
  ["TTIT-SL-0076","February","2026-02-04","Nadia Al-Amin",null,null,null,"Compliance","Upwork","Warm Lead","Simran","Contacted",4100,null,"2026-02-11","2026-02-21",null,"2026-02-04",null,null],
  ["TTIT-SL-0077","February","2026-02-06","James Park","ParkIT","james@parkit.com","+82 2 1234 5678","DevOps","LinkedIn","Hot Lead","Sahil","Won",2750,null,"2026-02-13",null,null,"2026-02-06",null,null],
  ["TTIT-SL-0078","February","2026-02-08","Elena Petrova",null,null,null,"InfoSec","Fivrr","Cold Lead","Vinay","Lost",null,null,"2026-02-15",null,null,"2026-02-08",null,null],
  ["TTIT-SL-0079","February","2026-02-10","Tariq Ibrahim","IbrahimGroup",null,null,"HR Recruiter","LinkedIn","Warm Lead","Devina","Follow-up Required",2600,null,"2026-02-17","2026-02-27",null,"2026-02-10",null,null],
  ["TTIT-SL-0080","February","2026-02-12","Patricia Gomez",null,null,null,"Development","Upwork","Cold Lead","Simran","No Response",null,null,"2026-02-19",null,null,"2026-02-12",null,null],
  ["TTIT-SL-0081","February","2026-02-14","Oliver Hughes","HughesTech","oliver@hughestech.co.uk",null,"Compliance","Direct Sales","Hot Lead","Sahil","Proposal Sent",8000,"2026-03-10","2026-02-21","2026-03-03",null,"2026-02-14",null,null],
  ["TTIT-SL-0082","February","2026-02-16","Zainab Hussain",null,null,null,"DevOps","LinkedIn","Warm Lead","Vinay","Contacted",3900,null,"2026-02-23","2026-03-05",null,"2026-02-16",null,null],
  ["TTIT-SL-0083","February","2026-02-18","Sven Lindqvist","LindqvistAB",null,null,"InfoSec","Email Marketing","Hot Lead","Devina","Negotiation",10500,"2026-03-15","2026-02-25","2026-03-07",null,"2026-02-18",null,null],
  ["TTIT-SL-0084","February","2026-02-20","Ananya Das",null,null,null,"HR Recruiter","Upwork","Cold Lead","Simran","Lost",null,null,"2026-02-27",null,null,"2026-02-20",null,null],
  ["TTIT-SL-0085","February","2026-02-22","Calvin Wong","WongConsult","calvin@wongconsult.com",null,"Development","LinkedIn","Hot Lead","Sahil","Won",null,null,"2026-03-01",null,null,"2026-02-22",null,null],
  ["TTIT-SL-0086","February","2026-02-24","Marta Kowalczyk",null,null,null,"Compliance","Freelancer","Warm Lead","Vinay","Follow-up Required",3700,null,"2026-03-03","2026-03-13",null,"2026-02-24",null,null],
  ["TTIT-SL-0087","March","2026-03-01","Darius Osei","OseiTech",null,null,"DevOps","LinkedIn","Hot Lead","Devina","Negotiation",1343.13,null,"2026-03-08","2026-03-18",null,"2026-03-01",null,null],
  ["TTIT-SL-0088","March","2026-03-02","Anna Petrova",null,null,null,"InfoSec","Upwork","Warm Lead","Simran","Contacted",4500,null,"2026-03-09","2026-03-19",null,"2026-03-02",null,null],
  ["TTIT-SL-0089","March","2026-03-03","Khalid Mansoor","MansoorGroup","khalid@mansoor.ae",null,"HR Recruiter","LinkedIn","Hot Lead","Sahil","Proposal Sent",7000,"2026-04-01","2026-03-10","2026-03-20",null,"2026-03-03",null,null],
  ["TTIT-SL-0090","March","2026-03-04","Lisa Chang",null,null,null,"Development","Fivrr","Cold Lead","Vinay","Lost",null,null,"2026-03-11",null,null,"2026-03-04",null,null],
  ["TTIT-SL-0091","March","2026-03-05","Thomas Müller","MüllerIT",null,null,"Compliance","Email Marketing","Warm Lead","Devina","Follow-up Required",5200,null,"2026-03-12","2026-03-22",null,"2026-03-05",null,null],
  ["TTIT-SL-0092","March","2026-03-06","Sunita Rao",null,null,null,"DevOps","Upwork","Cold Lead","Simran","New",null,null,"2026-03-13",null,null,"2026-03-06",null,null],
  ["TTIT-SL-0093","March","2026-03-07","Patrick Okonkwo","OkonkwoTech","patrick@okonkwo.com",null,"InfoSec","LinkedIn","Hot Lead","Sahil","Negotiation",11000,"2026-04-10","2026-03-14","2026-03-24",null,"2026-03-07",null,null],
  ["TTIT-SL-0094","March","2026-03-08","Lara Voigt",null,null,null,"HR Recruiter","Freelancer","Warm Lead","Vinay","Contacted",2900,null,"2026-03-15","2026-03-25",null,"2026-03-08",null,null],
  ["TTIT-SL-0095","March","2026-03-09","Jake Morrison","MorrisonDev","jake@morrisondev.io",null,"Development","Direct Sales","Hot Lead","Devina","Won",1343.13,null,"2026-03-16",null,null,"2026-03-09",null,null],
  ["TTIT-SL-0096","March","2026-03-10","Fatou Diop",null,null,null,"Compliance","LinkedIn","Cold Lead","Simran","New",null,null,"2026-03-17",null,null,"2026-03-10",null,null],
  ["TTIT-SL-0097","March","2026-03-11","Andrei Popescu","PopescuGroup",null,null,"DevOps","Email Marketing","Warm Lead","Sahil","Follow-up Required",6300,null,"2026-03-18","2026-03-28",null,"2026-03-11",null,null],
  ["TTIT-SL-0098","March","2026-03-12","Yara Al-Sayed",null,null,null,"InfoSec","Upwork","Hot Lead","Vinay","Proposal Sent",8200,"2026-04-15","2026-03-19","2026-03-29",null,"2026-03-12",null,null],
  ["TTIT-SL-0099","March","2026-03-13","Jason Tran","TranConsult","jason@tran.com.vn",null,"HR Recruiter","LinkedIn","Warm Lead","Devina","Contacted",3100,null,"2026-03-20","2026-03-30",null,"2026-03-13",null,null],
  ["TTIT-SL-0100","March","2026-03-14","Niamh O'Sullivan",null,null,null,"Development","Fivrr","Cold Lead","Simran","New",null,null,"2026-03-21",null,null,"2026-03-14",null,null],
  ["TTIT-SL-0101","March","2026-03-15","Emre Yilmaz","YilmazTech",null,null,"Compliance","LinkedIn","Hot Lead","Sahil","Negotiation",9800,"2026-04-20","2026-03-22","2026-04-01",null,"2026-03-15",null,null],
  ["TTIT-SL-0102","March","2026-03-16","Aditi Sharma",null,null,null,"DevOps","Upwork","Warm Lead","Vinay","Follow-up Required",4400,null,"2026-03-23","2026-04-02",null,"2026-03-16",null,null],
  ["TTIT-SL-0103","March","2026-03-17","Felipe Santos","SantosDev","felipe@santosdev.com.br",null,"InfoSec","Email Marketing","Hot Lead","Devina","Won",1343.13,null,"2026-03-24",null,null,"2026-03-17",null,null],
  ["TTIT-SL-0104","March","2026-03-18","Nina Bergman",null,null,null,"HR Recruiter","LinkedIn","Cold Lead","Simran","New",null,null,"2026-03-25",null,null,"2026-03-18",null,null],
  ["TTIT-SL-0105","March","2026-03-19","Arun Krishnan","KrishnanIT","arun@krishnanit.in","+91 96655 44332","Development","LinkedIn","Hot Lead","Sahil","Contacted",5600,null,"2026-03-26","2026-04-05",null,"2026-03-19",null,null],
];

// Pad to 175 with generic leads
while (LEADS.length < 175) {
  const n = LEADS.length + 1;
  const id = `TTIT-SL-${String(n).padStart(4,'0')}`;
  const statuses = ['New','Contacted','Follow-up Required','Lost','Won','No Response'];
  const channels = ['Upwork','LinkedIn','Fivrr','Direct Sales','Email Marketing'];
  const services = ['DevOps','Compliance','HR Recruiter','InfoSec','Development'];
  const persons  = ['Vinay','Devina','Simran','Sahil'];
  const cats     = ['Cold Lead','Warm Lead','Hot Lead'];
  LEADS.push([
    id, 'March', '2026-03-20', `Client ${n}`, null, null, null,
    services[n%5], channels[n%5], cats[n%3], persons[n%4],
    statuses[n%6], null, null, null, null, null, null, null, null
  ]);
}

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Starting seed...');
    let inserted = 0, skipped = 0;

    for (const row of LEADS) {
      try {
        await client.query(`
          INSERT INTO leads (
            lead_no, month, date_generated, client_name, company_name,
            contact_email, contact_phone, service_required, sales_channel,
            lead_category, assigned_to, lead_status, estimated_value_usd,
            expected_close_date, last_contact_date, next_followup_date,
            notes, created_at, interview_call_by, comments
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
          ON CONFLICT (lead_no) DO NOTHING`,
          row
        );
        inserted++;
      } catch (e) {
        console.warn(`Skip ${row[0]}: ${e.message}`);
        skipped++;
      }
    }
    console.log(`✅ Seed complete: ${inserted} inserted, ${skipped} skipped`);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(e => { console.error('Seed failed:', e); process.exit(1); });
