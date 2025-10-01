-- Enable real-time for library tables
-- This allows immediate synchronization between Global Libraries and Email Builder

-- Enable REPLICA IDENTITY FULL for complete row data during updates
ALTER TABLE phrase_library REPLICA IDENTITY FULL;
ALTER TABLE inquiry_library REPLICA IDENTITY FULL;
ALTER TABLE subject_library REPLICA IDENTITY FULL;
ALTER TABLE signature_library REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE phrase_library;
ALTER PUBLICATION supabase_realtime ADD TABLE inquiry_library;
ALTER PUBLICATION supabase_realtime ADD TABLE subject_library;
ALTER PUBLICATION supabase_realtime ADD TABLE signature_library;