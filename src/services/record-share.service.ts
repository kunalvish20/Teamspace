import { supabase } from '../lib/supabase/client'
import type { DatabaseProperty, DatabaseRow, Json, RowComment } from '../types/database.types'

export type RecordPermission = 'view' | 'edit' | 'admin'

export interface RecordSharePerson {
  id: string | null
  email: string
  permission: RecordPermission | 'owner'
  display_name: string | null
  is_owner: boolean
}

export interface SharedComment extends RowComment {
  authorName: string | null
  authorEmail: string | null
}

export interface SharedRecordBundle {
  permission: RecordPermission
  workspaceName: string
  databaseName: string
  row: DatabaseRow
  properties: DatabaseProperty[]
  comments: SharedComment[]
}

export async function ensureRecordShareLink(rowId: string) {
  const { data, error } = await supabase.rpc('ensure_record_share_link', { p_row_id: rowId })
  if (error || !data) throw new Error('Could not create a record link.')
  return data
}

export async function listRecordShares(rowId: string): Promise<RecordSharePerson[]> {
  const { data, error } = await supabase.rpc('list_record_shares', { p_row_id: rowId })
  if (error) throw new Error('Could not load record access.')
  return (data ?? []) as RecordSharePerson[]
}

export async function grantRecordShare(rowId: string, email: string, permission: RecordPermission) {
  const { data, error } = await supabase.rpc('grant_record_share', { p_row_id: rowId, p_email: email, p_permission: permission })
  if (error || !data?.[0]) throw new Error('Could not grant access.')
  return data[0]
}

export async function sendRecordShareInvite(rowId: string, email: string, permission: RecordPermission) {
  const share = await grantRecordShare(rowId, email, permission)
  const redirectTo = `${window.location.origin}/shared/record/${encodeURIComponent(share.link_id)}`
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: redirectTo,
    },
  })
  if (error) throw new Error(error.message || 'Access was granted, but the invitation email could not be sent.')
  return share
}

export async function updateRecordShare(shareId: string, permission: RecordPermission) {
  const { error } = await supabase.rpc('update_record_share', { p_share_id: shareId, p_permission: permission })
  if (error) throw new Error('Could not update permission.')
}

export async function revokeRecordShare(shareId: string) {
  const { error } = await supabase.rpc('revoke_record_share', { p_share_id: shareId })
  if (error) throw new Error('Could not remove access.')
}

export async function getSharedRecord(linkId: string): Promise<SharedRecordBundle | null> {
  const { data, error } = await supabase.rpc('get_shared_record', { p_link_id: linkId })
  if (error) {
    if (error.message.includes('Access denied')) throw new Error('unauthorized')
    throw new Error('unavailable')
  }
  return data as unknown as SharedRecordBundle | null
}

export async function updateSharedRecordValue(linkId: string, propertyId: string, value: Json | undefined) {
  const { data, error } = await supabase.rpc('update_shared_record_value', { p_link_id: linkId, p_property_id: propertyId, p_value: value ?? null })
  if (error || !data) throw new Error('Could not update this record.')
  return data as unknown as DatabaseRow
}

export async function addSharedRecordComment(linkId: string, body: string) {
  const { error } = await supabase.rpc('add_shared_record_comment', { p_link_id: linkId, p_body: body })
  if (error) throw new Error('Could not add comment.')
}
