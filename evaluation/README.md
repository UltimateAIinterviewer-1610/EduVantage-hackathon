# Study Lab evaluation

`tests/studyEvaluation.test.ts` is a reproducible, key-free retrieval check on a small team-built fixture with known source locations and two off-material questions. Its `precision@4` and `recall@4` are exact chunk-ID measures, not LLM-judge metrics or evidence of live-provider quality.

For a real-provider run, collect responses from the current deployed or local Study Lab with the evaluation questions, and place a private JSON file in this directory with one object per case: `input`, `actual_output`, `expected_output`, and `retrieval_context` (an array of the exact passages sent to the provider). Run `python evaluation/deepeval_run.py evaluation/live_outputs.json` after installing `evaluation/requirements.txt` and configuring the evaluation provider per DeepEval. The runner computes faithfulness, answer relevancy, contextual precision, and contextual recall. It does not log provider keys. Do not commit `live_outputs.json` if it contains learner material; use the synthetic fixture instead.

No DeepEval scores are claimed until a real-provider run has completed. The small retrieval fixture should be expanded with representative textbooks, slides, captions, image descriptions, and unsupported questions before using these numbers as product evidence.

Latest key-free run (15 October 2026): 10 synthetic questions, including two off-material queries; exact chunk-location precision@4 = 1.00 and recall@4 = 1.00. This fixture is intentionally small and direct, so it does not establish performance on real lecture media or ambiguous questions.

`tests/studySimulation.test.ts` reopens saved progress over three synthetic sessions for two separate learner profiles. On its fixed answer sequences, estimated familiarity changed by +79 percentage points for the improving profile and +3 for the profile needing review, measured from the first simulated session to the last. Exact prompt repetition rate was 0/4 for each profile because the fixture supplies four distinct prompts. These numbers verify persistence and calculation, not educational efficacy or the generation system's real-world repetition rate.
