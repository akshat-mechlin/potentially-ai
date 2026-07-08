-- Allow members to leave a group and owners to delete a group

CREATE POLICY "Members can leave workspace" ON workspace_members
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Owners can delete workspace" ON workspaces
  FOR DELETE USING (get_workspace_role(id) = 'owner');
