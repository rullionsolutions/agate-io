
INSERT INTO sy_list (_key, _tx, area, id, title) VALUES
    ('ac.email_status', null, 'ac', 'email_status', 'Email Status');


INSERT INTO sy_list_item (_key, _tx, seq_number, list, id, text, active, from_value, to_value) VALUES
    ('ac.email_status.D', null, '10', 'ac.email_status', 'D', 'draft', 'A', null, null),
    ('ac.email_status.E', null, '50', 'ac.email_status', 'E', 'error', 'A', null, null),
    ('ac.email_status.F', null, '40', 'ac.email_status', 'F', 'failed', 'A', null, null),
    ('ac.email_status.N', null, '20', 'ac.email_status', 'N', 'not sent', 'A', null, null),
    ('ac.email_status.S', null, '30', 'ac.email_status', 'S', 'sent', 'A', null, null);
