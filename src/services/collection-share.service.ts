import { supabase } from '../lib/supabase/client'
import type { DatabaseProperty, DatabaseRow, DatabaseView, Json, WorkspaceDatabase } from '../types/database.types'

export type CollectionPermission = 'view' | 'edit' | 'admin'

export interface CollectionSharePerson {
  id: string | null
  email: string
  permission: CollectionPermission | 'owner'
  display_name: string | null
  is_owner: boolean
}

export interface SharedCollectionBundle {
  permission: CollectionPermission
  workspaceName: string
  database: WorkspaceDatabase
  properties: DatabaseProperty[]
  views: DatabaseView[]
  rows: DatabaseRow[]
}

interface GrantCollectionShareResult {
  link_id: string
  share_id: string
}

type RpcError = { message: string }
type RpcResult<T> = PromiseLike<{ data: T | null; error: RpcError | null }>
type CollectionShareRpc = {
  rpc(functionName: 'ensure_collection_share_link', args: { p_database_id: string }): RpcResult<string>
  rpc(functionName: 'list_collection_shares', args: { p_database_id: string }): RpcResult<CollectionSharePerson[]>
  rpc(functionName: 'grant_collection_share', args: { p_database_id: string; p_email: string; p_permission: CollectionPermission }): RpcResult<GrantCollectionShareResult[]>
  rpc(functionName: 'update_collection_share', args: { p_share_id: string; p_permission: CollectionPermission }): RpcResult<null>
  rpc(functionName: 'revoke_collection_share', args: { p_share_id: string }): RpcResult<null>
  rpc(functionName: 'get_shared_collection', args: { p_link_id: string }): RpcResult<SharedCollectionBundle>
  rpc(functionName: 'update_shared_collection_value', args: { p_link_id: string; p_row_id: string; p_property_id: string; p_value: Json | null }): RpcResult<DatabaseRow>
}

const collectionShareRpc = supabase as unknown as CollectionShareRpc

export async function ensureCollectionShareLink(databaseId: string): Promise<string> {
  const { data, error } = await collectionShareRpc.rpc('ensure_collection_share_link', { p_database_id: databaseId })
  if (error || !data) throw new Error('Could not create a collection link.')
  return data
}

export async function listCollectionShares(databaseId: string): Promise<CollectionSharePerson[]> {
  const { data, error } = await collectionShareRpc.rpc('list_collection_shares', { p_database_id: databaseId })
  if (error) throw new Error('Could not load collection access.')
  return data ?? []
}

export async function grantCollectionShare(databaseId: string, email: string, permission: CollectionPermission): Promise<GrantCollectionShareResult> {
  const { data, error } = await collectionShareRpc.rpc('grant_collection_share', { p_database_id: databaseId, p_email: email, p_permission: permission })
  if (error || !data?.[0]) throw new Error('Could not grant access.')
  return data[0]
}

export async function sendCollectionShareInvite(databaseId: string, email: string, permission: CollectionPermission): Promise<GrantCollectionShareResult> {
  const share = await grantCollectionShare(databaseId, email, permission)
  const redirectTo = `${window.location.origin}/shared/collection/${encodeURIComponent(share.link_id)}`
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

export async function updateCollectionShare(shareId: string, permission: CollectionPermission): Promise<void> {
  const { error } = await collectionShareRpc.rpc('update_collection_share', { p_share_id: shareId, p_permission: permission })
  if (error) throw new Error('Could not update permission.')
}

export async function revokeCollectionShare(shareId: string): Promise<void> {
  const { error } = await collectionShareRpc.rpc('revoke_collection_share', { p_share_id: shareId })
  if (error) throw new Error('Could not remove access.')
}

export async function getSharedCollection(linkId: string): Promise<SharedCollectionBundle | null> {
  const { data, error } = await collectionShareRpc.rpc('get_shared_collection', { p_link_id: linkId })
  if (error) {
    if (error.message.includes('Access denied')) throw new Error('unauthorized')
    throw new Error('unavailable')
  }
  return data
}

export async function updateSharedCollectionValue(linkId: string, rowId: string, propertyId: string, value: Json | undefined): Promise<DatabaseRow> {
  const { data, error } = await collectionShareRpc.rpc('update_shared_collection_value', { p_link_id: linkId, p_row_id: rowId, p_property_id: propertyId, p_value: value ?? null })
  if (error || !data) throw new Error('Could not update this record.')
  return data
}
