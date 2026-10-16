-- Clear existing FAQ items and re-seed
-- Run this once to set up FAQs
DELETE FROM faq_items WHERE true;

INSERT INTO faq_items (question, answer, sort_order, is_active) VALUES
('What''s the dress code?', 'Smart-casual to semi-formal. It''s an outdoor venue in October, so we''d recommend bringing a layer for the evening. Think garden party with a bit of elegance — no need for black tie.', 1, true),
('How do I get to the venue?', 'La Garriga de Castelladral is about 1.5 hours from Barcelona by car. We''re also arranging organised transport from Barcelona — details to follow. Let us know in your RSVP if you''d like a seat on the bus.', 2, true),
('Is there parking at the venue?', 'Yes, there is parking available at the venue. More details to follow closer to the date.', 3, true),
('Can I bring children?', 'We love your little ones, but this is an adults-only celebration. We hope you can find childcare and join us for the day — it''ll be worth it!', 4, true),
('What time does the day start and end?', 'The ceremony starts in the afternoon. The full schedule is on this page. The evening will go on late, so pace yourselves.', 5, true),
('Can I take photos during the ceremony?', 'We''d love for you to be present in the moment during the ceremony itself — we have a photographer. Feel free to take as many photos as you like during the rest of the day.', 6, true),
('Will there be vegetarian and vegan options?', 'Yes — please let us know your dietary requirements in the RSVP form and we''ll make sure you''re well looked after.', 7, true),
('What''s the weather like in October?', 'October in Catalonia is generally mild and sunny — expect highs of around 18–22°C during the day, cooler in the evenings. We recommend bringing a light jacket.', 8, true),
('I have a question that isn''t answered here.', 'Please get in touch at hello@giancat.com and we''ll get back to you.', 9, true);
