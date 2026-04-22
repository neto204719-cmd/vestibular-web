/**
 * questionsClient.js
 * Queries questions and filter metadata directly from Supabase,
 * bypassing the Express backend. Both tables have public-read RLS policies;
 * onlyWrong/onlyFavorites use the authenticated user's session.
 */
import { supabase } from './supabase'

/**
 * Fetch paginated questions with optional filters.
 * Returns { data, count, page, limit, pages }
 */
export async function fetchQuestions({
  subject_area = '',
  vestibular   = '',
  year         = '',
  topic        = '',
  onlyImages   = false,
  onlyWrong    = false,
  onlyFavorites = false,
  page         = 1,
  limit        = 10,
} = {}) {

  // ── Pre-filters that require subquery (onlyWrong / onlyFavorites) ──
  let filterIds = null // null = no restriction

  if (onlyWrong || onlyFavorites) {
    const { data: { user } } = await supabase.auth.getUser()
    let wrongIds    = null
    let favoriteIds = null

    if (onlyWrong && user) {
      const { data } = await supabase
        .from('student_answers')
        .select('question_id')
        .eq('user_id', user.id)
        .eq('is_correct', false)
      wrongIds = [...new Set((data ?? []).map(r => r.question_id))]
    }

    if (onlyFavorites && user) {
      const { data } = await supabase
        .from('question_favorites')
        .select('question_id')
        .eq('user_id', user.id)
      favoriteIds = (data ?? []).map(r => r.question_id)
    }

    if (wrongIds !== null && favoriteIds !== null) {
      const wrongSet = new Set(wrongIds)
      filterIds = favoriteIds.filter(id => wrongSet.has(id))
    } else {
      filterIds = wrongIds ?? favoriteIds
    }

    if ((filterIds ?? []).length === 0) {
      return { data: [], count: 0, page, limit, pages: 0 }
    }
  }

  const offset = (page - 1) * limit

  // ── Count query ──
  let countQ = supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })

  if (subject_area) countQ = countQ.eq('subject_area', subject_area)
  if (vestibular)   countQ = countQ.eq('vestibular', vestibular)
  if (year)         countQ = countQ.eq('year', parseInt(year, 10))
  if (topic)        countQ = countQ.ilike('topic', `%${topic}%`)
  if (onlyImages)   countQ = countQ.not('image_url', 'is', null)
  if (filterIds)    countQ = countQ.in('id', filterIds)

  const { count, error: countError } = await countQ
  if (countError) throw new Error(countError.message)

  // ── Data query ──
  let dataQ = supabase
    .from('questions')
    .select('id, question_id, vestibular, year, subject, subject_area, topic, statement, correct_letter, explanation, image_url, question_type, options(letter, text)')

  if (subject_area) dataQ = dataQ.eq('subject_area', subject_area)
  if (vestibular)   dataQ = dataQ.eq('vestibular', vestibular)
  if (year)         dataQ = dataQ.eq('year', parseInt(year, 10))
  if (topic)        dataQ = dataQ.ilike('topic', `%${topic}%`)
  if (onlyImages)   dataQ = dataQ.not('image_url', 'is', null)
  if (filterIds)    dataQ = dataQ.in('id', filterIds)

  const { data, error } = await dataQ
    .order('year', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw new Error(error.message)

  return {
    data:  data  ?? [],
    count: count ?? 0,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  }
}

/**
 * Fetch filter metadata (vestibulares, subject_areas, years) via Supabase RPC.
 */
export async function fetchFiltersMetadata() {
  const { data, error } = await supabase.rpc('get_filter_metadata')
  if (error) throw new Error(error.message)
  return {
    vestibulares:  data?.vestibulares  ?? [],
    subject_areas: data?.subject_areas ?? [],
    years:         data?.years         ?? [],
  }
}
