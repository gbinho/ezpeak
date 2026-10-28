alter table public.decks drop constraint decks_language_check;
alter table public.decks add constraint decks_language_check check (language in ('en','ja','ru','fr'));
