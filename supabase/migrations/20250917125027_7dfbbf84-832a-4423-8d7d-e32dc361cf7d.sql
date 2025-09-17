-- Update EBITDA range values from <20, 20-35 to <30, 30-35 in opportunities_raw table

-- Update ebitda column values
UPDATE opportunities_raw 
SET ebitda = '<30' 
WHERE ebitda = '<20';

UPDATE opportunities_raw 
SET ebitda = '30-35' 
WHERE ebitda = '20-35';

-- Update ebitda_notes column references
UPDATE opportunities_raw 
SET ebitda_notes = REPLACE(ebitda_notes, '<20', '<30')
WHERE ebitda_notes LIKE '%<20%';

UPDATE opportunities_raw 
SET ebitda_notes = REPLACE(ebitda_notes, '20-35', '30-35')
WHERE ebitda_notes LIKE '%20-35%';

-- Update any other text references in other relevant columns
UPDATE opportunities_raw 
SET summary_of_opportunity = REPLACE(summary_of_opportunity, '<20', '<30')
WHERE summary_of_opportunity LIKE '%<20%';

UPDATE opportunities_raw 
SET summary_of_opportunity = REPLACE(summary_of_opportunity, '20-35', '30-35')
WHERE summary_of_opportunity LIKE '%20-35%';

UPDATE opportunities_raw 
SET most_recent_notes = REPLACE(most_recent_notes, '<20', '<30')
WHERE most_recent_notes LIKE '%<20%';

UPDATE opportunities_raw 
SET most_recent_notes = REPLACE(most_recent_notes, '20-35', '30-35')
WHERE most_recent_notes LIKE '%20-35%';