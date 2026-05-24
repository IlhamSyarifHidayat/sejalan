create table if not exists rooms (
 id uuid primary key default gen_random_uuid(),
 invite_code text unique not null,
 creator_username text not null,
 partner_username text,
 status text default 'waiting_partner',
 anniversary_date date,
 updated_at timestamptz default now()
);
create table if not exists sejalan_state (
 couple_code text primary key references rooms(invite_code) on delete cascade,
 mood_creator text,
 mood_partner text,
 shared_notes text,
 partner_activity text,
 streak int default 0,
 plans jsonb default '[]'::jsonb,
 updated_at timestamptz default now()
);