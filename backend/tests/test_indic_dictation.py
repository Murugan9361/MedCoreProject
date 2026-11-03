"""
Unit & Integration tests for AI4Bharat IndicWhisper Dictation & Tanglish Normalization.
Verifies linguistic accuracy, voice punctuation, and API endpoints.
"""

import unittest
from app.services.indic_transcription import clean_clinical_text


class TestIndicTranscription(unittest.TestCase):
    def test_symptom_normalization(self):
        cases = [
            ("Patient has thala vali since yesterday", "Patient has headache since yesterday"),
            ("Complains of kaachal and vaanthi", "Complains of fever and vomiting"),
            ("vaiyiru vali after eating food", "Abdominal pain after eating food"),
            ("severe muttu vali and kaal vali", "Severe knee joint pain and leg pain"),
            ("feeling mayakkam and udambu vali", "Feeling dizziness/giddiness and generalized body ache/myalgia"),
            ("has sali and irumal", "Has cold and sore throat and cough"),
            ("reports loose motion 3 days-ah", "Reports loose stools/diarrhea for 3 days"),
            ("severe nenju vali with moochu thinaral", "Severe chest pain with dyspnea/shortness of breath"),
            ("skin arippu all over", "Skin pruritus/skin itching all over"),
        ]
        for spoken, expected in cases:
            result = clean_clinical_text(spoken)
            self.assertEqual(result, expected, f"Failed on: '{spoken}' -> Got: '{result}'")

    def test_medical_acronym_capitalization(self):
        cases = [
            ("bp was 120/80 and ecg was normal", "BP was 120/80 and ECG was normal"),
            ("ordered cbc, mri, and ct scan", "Ordered CBC, MRI, and CT Scan"),
            ("take tablet dolo 650 sos", "Take tablet dolo 650 SOS"),
            ("prescribed tab pantoprazole od and paracetamol bd", "Prescribed tab pantoprazole OD (once daily) and paracetamol BD (twice daily)"),
            ("spo2 is 98 percent", "SpO2 is 98 percent"),
            ("hba1c is 6.5 percent", "HbA1c is 6.5 percent"),
        ]
        for spoken, expected in cases:
            result = clean_clinical_text(spoken)
            self.assertEqual(result, expected, f"Failed on: '{spoken}' -> Got: '{result}'")

    def test_timing_and_instructions(self):
        cases = [
            ("take 1 tablet saptu aparam", "Take 1 tablet after food (postprandial)"),
            ("take medication verum vayiru", "Take medication before food (preprandial)"),
            ("fever 3 days irukku", "Fever for 3 days"),
            ("adutha vaaram checkup vaanga", "Follow-up review scheduled"),
        ]
        for spoken, expected in cases:
            result = clean_clinical_text(spoken)
            self.assertEqual(result, expected, f"Failed on: '{spoken}' -> Got: '{result}'")

    def test_voice_punctuation(self):
        spoken = "patient conscious comma oriented full stop vitals stable colon bp 120/80 next line follow up next week"
        result = clean_clinical_text(spoken)
        self.assertIn(",", result)
        self.assertIn(".", result)
        self.assertIn(":", result)
        self.assertIn("\n", result)


if __name__ == "__main__":
    unittest.main()

