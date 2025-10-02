-- Seed missing phrase categories with default phrases

-- Focus Area Defaults
INSERT INTO public.phrase_library (category, phrase_text, tri_state, weight, is_global, template_id, sync_behavior) VALUES
('focus_area_defaults', 'Please keep us in mind if you hear of anything in [Focus Area] that fits our strike zone.', 'sometimes', 1.0, true, null, 'inherit'),
('focus_area_defaults', '[Focus Area] remains an area of high priority for us.', 'sometimes', 1.0, true, null, 'inherit'),
('focus_area_defaults', '[Focus Area] continues to be a core priority.', 'sometimes', 1.0, true, null, 'inherit'),
('focus_area_defaults', 'We are spending time in [Focus Area].', 'sometimes', 1.0, true, null, 'inherit'),
('focus_area_defaults', '[Focus Area] is a sector where we are actively involved.', 'sometimes', 1.0, true, null, 'inherit'),
('focus_area_defaults', '[Focus Area] is a key focus area for our team.', 'sometimes', 1.0, true, null, 'inherit');

-- Team Mention phrases
INSERT INTO public.phrase_library (category, phrase_text, tri_state, weight, is_global, template_id, sync_behavior) VALUES
('team_mention', '[LG Lead] and I continue to be interested in [Focus Area] — please keep us in mind if you hear of anything that fits our strike zone.', 'sometimes', 1.0, true, null, 'inherit'),
('team_mention', '[LG Lead] and I continue to focus on identifying and evaluating new platform opportunities in [Focus Area], especially >$[EBITDA]m and [sub sector].', 'sometimes', 1.0, true, null, 'inherit'),
('team_mention', 'If helpful, [Teammate] can compare notes with you on [topic].', 'sometimes', 1.0, true, null, 'inherit');

-- Attachment introduction phrases
INSERT INTO public.phrase_library (category, phrase_text, tri_state, weight, is_global, template_id, sync_behavior) VALUES
('attachments', 'I''ve attached a brief overview: [Title].', 'sometimes', 1.0, true, null, 'inherit'),
('attachments', 'Please see the attached summary for more detail: [Title].', 'sometimes', 1.0, true, null, 'inherit'),
('attachments', 'Sharing a reference document: [Title].', 'sometimes', 1.0, true, null, 'inherit'),
('attachments', 'You''ll find a short overview attached: [Title].', 'sometimes', 1.0, true, null, 'inherit'),
('attachments', 'Attaching a quick summary you may find useful: [Title].', 'sometimes', 1.0, true, null, 'inherit'),
('attachments', 'Here''s a background doc with additional detail: [Title].', 'sometimes', 1.0, true, null, 'inherit');