"""Evaluate captured Study Lab responses with DeepEval; no source or key is printed."""
import json
import sys
from deepeval.metrics import AnswerRelevancyMetric, FaithfulnessMetric, ContextualPrecisionMetric, ContextualRecallMetric
from deepeval.test_case import LLMTestCase

if len(sys.argv) != 2:
    raise SystemExit('Usage: python evaluation/deepeval_run.py PATH_TO_PRIVATE_JSON')
with open(sys.argv[1], encoding='utf-8') as file:
    rows = json.load(file)
if not isinstance(rows, list) or not rows:
    raise SystemExit('Expected a nonempty JSON array of evaluation cases.')
metrics = [FaithfulnessMetric(), AnswerRelevancyMetric(), ContextualPrecisionMetric(), ContextualRecallMetric()]
scores = {metric.__class__.__name__: [] for metric in metrics}
for row in rows:
    case = LLMTestCase(input=row['input'], actual_output=row['actual_output'], expected_output=row['expected_output'], retrieval_context=row['retrieval_context'])
    for metric in metrics:
        metric.measure(case)
        scores[metric.__class__.__name__].append(float(metric.score or 0))
for name, values in scores.items():
    print(f'{name}: {sum(values) / len(values):.3f} across {len(values)} cases')
