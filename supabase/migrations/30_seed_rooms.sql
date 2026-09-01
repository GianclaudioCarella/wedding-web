-- Seed all 20 rooms from CAST venue with accurate data

-- SEGUNDA PLANTA (Second Floor - Main House)
INSERT INTO venue_rooms (name, room_type, capacity, section, amenities, extra_bed_type, sort_order, reserved_for, floor) VALUES
('Suite', 'private', 2, 'Second Floor', ARRAY['Terrace', 'Shower', 'Bath'], NULL, 0, 'Gian & Cat (Newlyweds)', NULL),
('La Pequeña', 'private', 1, 'Second Floor', ARRAY['Shower'], NULL, 1, NULL, NULL),
('Arco', 'private', 2, 'Second Floor', ARRAY['Bath'], 'supletoria', 2, NULL, NULL),
('La Grande', 'private', 2, 'Second Floor', ARRAY['Shower', 'Bath'], 'supletoria', 3, NULL, NULL),
('Tejados', 'private', 3, 'Second Floor', ARRAY['Shower', 'Duplex'], 'supletoria', 4, NULL, NULL),
('Sabina', 'private', 3, 'Second Floor', ARRAY['Bath', 'Duplex'], 'supletoria', 5, NULL, NULL),
('India', 'private', 2, 'Second Floor', ARRAY['Shower'], 'supletoria', 6, NULL, NULL),
('Caballos', 'private', 2, 'Second Floor', ARRAY['Shower'], 'cuna', 7, NULL, NULL);

-- CON JARDÍN (With Garden - Cottage Side)
INSERT INTO venue_rooms (name, room_type, capacity, section, amenities, extra_bed_type, sort_order, reserved_for, floor) VALUES
('Lana', 'private', 3, 'Garden Side', ARRAY['Terrace', 'Shower', 'Bath'], 'supletoria', 8, NULL, NULL),
('Vino', 'private', 2, 'Garden Side', ARRAY['Terrace', 'Shower', 'Bath'], 'supletoria', 9, NULL, NULL),
('Aceite', 'private', 3, 'Garden Side', ARRAY['Terrace', 'Shower', 'Bath'], 'supletoria', 10, NULL, NULL),
('Madera', 'private', 2, 'Garden Side', ARRAY['Terrace', 'Shower', 'Bath'], 'supletoria', 11, NULL, NULL),
('Trigo', 'private', 3, 'Garden Side', ARRAY['Terrace', 'Shower', 'Bath'], 'supletoria', 12, NULL, NULL),
('Miel', 'private', 2, 'Garden Side', ARRAY['Terrace', 'Shower', 'Bath'], 'supletoria', 13, NULL, NULL);

-- CON TERRAZA (With Terrace - First Floor Cottage)
INSERT INTO venue_rooms (name, room_type, capacity, section, amenities, extra_bed_type, sort_order, reserved_for, floor) VALUES
('Oveja', 'private', 2, 'Terrace Side', ARRAY['Terrace', 'Shower'], 'cuna', 14, NULL, '1st'),
('Uva', 'private', 2, 'Terrace Side', ARRAY['Terrace', 'Shower'], 'cuna', 15, NULL, '1st'),
('Oliva', 'private', 2, 'Terrace Side', ARRAY['Terrace', 'Shower'], 'cuna', 16, NULL, '1st'),
('Bosque', 'private', 2, 'Terrace Side', ARRAY['Terrace', 'Shower'], 'cuna', 17, NULL, '1st'),
('Semilla', 'private', 2, 'Terrace Side', ARRAY['Terrace', 'Shower'], 'cuna', 18, NULL, '1st'),
('Flor', 'private', 2, 'Terrace Side', ARRAY['Terrace', 'Shower', 'Accessible'], 'cuna', 19, NULL, '1st');
