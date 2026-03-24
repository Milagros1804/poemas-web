import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xmbuidcaxgauqzieojhy.supabase.co'
const supabaseKey = 'sb_publishable_jSp2L_hcxgPFEk5geKh3HQ_tPj_seXz'

export const supabase = createClient(supabaseUrl, supabaseKey)