-- Link saved assistant turns without changing existing one-shot draft records.
ALTER TABLE public.research_assistant_drafts
  ADD COLUMN parent_draft_id uuid,
  ADD COLUMN step_number smallint NOT NULL DEFAULT 1,
  ADD COLUMN previous_step_number smallint GENERATED ALWAYS AS (step_number - 1) STORED,
  ADD CONSTRAINT research_assistant_step_number_check
    CHECK ((parent_draft_id IS NULL AND step_number = 1) OR
      (parent_draft_id IS NOT NULL AND step_number BETWEEN 2 AND 5)),
  ADD CONSTRAINT research_assistant_draft_step_key UNIQUE (id, workspace_id, owner_id, step_number),
  ADD CONSTRAINT research_assistant_draft_parent_fk
    FOREIGN KEY (parent_draft_id, workspace_id, owner_id, previous_step_number)
    REFERENCES public.research_assistant_drafts (id, workspace_id, owner_id, step_number);
CREATE INDEX research_assistant_draft_parent_idx
  ON public.research_assistant_drafts (parent_draft_id)
  WHERE parent_draft_id IS NOT NULL;

GRANT INSERT (parent_draft_id, step_number) ON public.research_assistant_drafts TO authenticated;
