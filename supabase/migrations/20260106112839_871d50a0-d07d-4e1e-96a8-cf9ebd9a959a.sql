-- Remove old check columns and add new ones for driver_entries
ALTER TABLE public.driver_entries
  DROP COLUMN IF EXISTS check_damage,
  DROP COLUMN IF EXISTS check_fuel,
  DROP COLUMN IF EXISTS check_oil,
  DROP COLUMN IF EXISTS check_lights,
  DROP COLUMN IF EXISTS check_tyres;

-- Add new vehicle check columns
ALTER TABLE public.driver_entries
  ADD COLUMN start_mileage integer,
  ADD COLUMN end_mileage integer,
  ADD COLUMN check_leaks boolean,
  ADD COLUMN check_tyres_wheels boolean,
  ADD COLUMN check_mirrors boolean,
  ADD COLUMN check_lights boolean,
  ADD COLUMN check_indicators boolean,
  ADD COLUMN check_wipers_washers boolean,
  ADD COLUMN check_windows boolean,
  ADD COLUMN check_horn boolean,
  ADD COLUMN check_no_excess_smoke boolean,
  ADD COLUMN check_brakes boolean,
  ADD COLUMN check_body_damage boolean,
  ADD COLUMN check_fluids boolean,
  ADD COLUMN check_first_aid_kit boolean,
  ADD COLUMN check_cleanliness boolean,
  ADD COLUMN check_hackney_plate boolean,
  ADD COLUMN check_defects_reported boolean,
  ADD COLUMN additional_comments text;