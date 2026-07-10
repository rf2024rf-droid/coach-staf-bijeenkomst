alter table presentations
  add column if not exists general_screen_font_family text,
  add column if not exists general_screen_font_size integer;
