import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { marked } from 'marked'; // <-- Import the marked library

const EnhancedSymptomChecker = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // State for form inputs
  const [helpType, setHelpType] = useState('medical_assistance');
  const [textInput, setTextInput] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [pdfWarning, setPdfWarning] = useState(false);

  // State for API response and loading
  const [aiResponse, setAiResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAttachmentChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachmentFile(file);
      setPdfWarning(file.type === 'application/pdf');
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
    });
  };

  const handleSubmit = async () => {
    setError('');
    setAiResponse('');
    setIsSubmitting(true);

    try {
      if (!textInput.trim() && !imageFile && !attachmentFile) {
        setError(t('symptomChecker.emptyInput'));
        return;
      }

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        setError('API key is missing. Please ensure VITE_GEMINI_API_KEY is set.');
        return;
      }
      
      // IMPROVEMENT 1: Using the more detailed and safer prompts from your index.html
      // For best practice, these should be moved to your i18n translation files.
      const promptMap = {
        medical_assistance: `Act as a professional medical first aid assistant. Provide necessary first aid advice based on the following symptoms/information. It is extremely important that you **do not** give a formal medical diagnosis. You must include a strong disclaimer at the beginning of your response stating that this is **not a substitute for professional medical advice** and to seek immediate professional help if the symptoms are severe or worsen.`,
        prescription_reader: `Act as an expert assistant. Read and transcribe the text from the provided prescription image/document. Clearly state any medications, dosages, and instructions you can decipher. If unable to read, state "Unable to decipher.". You must include a strong disclaimer that this is **not a substitute for professional medical advice**.`,
        medicine_describer: `Act as an expert assistant. Identify the medicine from the provided image/name. Explain its general use, common side effects, and recommended dosage ranges for adults (if applicable). If information is missing, state it. You must include a strong disclaimer that this is **not a substitute for professional medical advice**.`,
        report_analyzer: `Act as an expert medical report analyzer. Summarize the provided medical report (blood test, etc.). Highlight what results are within normal ranges, what is abnormal, and what these might indicate in general terms. Suggest **general** further steps or considerations, but **do not provide a diagnosis or specific medical recommendations**. Include a strong disclaimer that this is **not a substitute for professional medical advice**.`,
      };
      
      const userPrompt = promptMap[helpType] || 'Provide general assistance based on the input.';
      
      // IMPROVEMENT 2: Correctly building the API payload as a single message
      // This is the most critical fix.
      const parts = [{ text: userPrompt }];

      if (textInput.trim()) {
        parts.push({ text: textInput });
      }

      if (imageFile) {
        const imageBase64 = await fileToBase64(imageFile);
        parts.push({ inlineData: { mimeType: imageFile.type, data: imageBase64 } });
      }

      if (attachmentFile) {
        const attachmentBase64 = await fileToBase64(attachmentFile);
        parts.push({ inlineData: { mimeType: attachmentFile.type, data: attachmentBase64 } });
      }
      
      const payload = {
        contents: [{ role: "user", parts: parts }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 3000, // IMPROVEMENT 3: Increased token limit for longer responses
        }
      };
      
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await axios.post(apiUrl, payload);

      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const generatedText = response.data.candidates[0].content.parts[0].text;
        // IMPROVEMENT 4: Parse the markdown response for better formatting
        const formattedHtml = marked.parse(generatedText);
        setAiResponse(formattedHtml);
      } else {
        setError(t('symptomChecker.noResponse'));
      }
    } catch (err) {
      console.error('API Error:', err);
      // IMPROVEMENT 5: Better error handling
      let errorMessage = t('symptomChecker.noResponse');
      if (err.response) {
        if (err.response.status === 401 || err.response.status === 403) {
          errorMessage = t('symptomChecker.apiUnauthorized');
        } else if (err.response.status === 429) {
          errorMessage = t('symptomChecker.rateLimit');
        } else {
          errorMessage = err.response.data?.error?.message || errorMessage;
        }
      } else if (err.message.includes('API key')) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTextInput('');
    setImageFile(null);
    setAttachmentFile(null);
    setImagePreview('');
    setPdfWarning(false);
    setAiResponse('');
    setError('');
  };

  const handleFindDoctor = () => {
    navigate('/doctors');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">{t('symptomChecker.title')}</h2>
          <p className="text-gray-600 mb-6 text-center">
            {t('symptomChecker.description')}
          </p>

          {/* Form remains the same */}
          <div className="w-full mb-4">
            <label htmlFor="helpType" className="block text-gray-700 font-medium mb-2">
              {t('symptomChecker.helpType')}
            </label>
            <select
              id="helpType"
              value={helpType}
              onChange={(e) => setHelpType(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="medical_assistance">{t('symptomChecker.helpTypes.medicalAssistance')}</option>
              <option value="prescription_reader">{t('symptomChecker.helpTypes.prescriptionReader')}</option>
              <option value="medicine_describer">{t('symptomChecker.helpTypes.medicineDescriber')}</option>
              <option value="report_analyzer">{t('symptomChecker.helpTypes.reportAnalyzer')}</option>
            </select>
          </div>

          <div className="w-full mb-4">
            <label htmlFor="textInput" className="block text-gray-700 font-medium mb-2">
              {t('symptomChecker.textInput')}
            </label>
            <textarea
              id="textInput"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={t('symptomChecker.textInputPlaceholder')}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
            />
          </div>

          <div className="w-full mb-4">
            <label htmlFor="imageInput" className="block text-gray-700 font-medium mb-2">
              {t('symptomChecker.imageInput')}
            </label>
            <input
              type="file"
              id="imageInput"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {imagePreview && (
            <div className="w-full mb-4">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="max-w-full h-auto rounded-md border border-gray-200"
                style={{ maxHeight: '300px' }}
              />
            </div>
          )}

          <div className="w-full mb-6">
            <label htmlFor="attachmentInput" className="block text-gray-700 font-medium mb-2">
              {t('symptomChecker.attachmentInput')}
            </label>
            <input
              type="file"
              id="attachmentInput"
              accept="image/*,.pdf"
              onChange={handleAttachmentChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('symptomChecker.attachmentNote')}
            </p>
          </div>

          {pdfWarning && (
            <div className="w-full mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                {t('symptomChecker.pdfWarning')}
              </p>
            </div>
          )}

          <div className="w-full mb-6">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition duration-300 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t('symptomChecker.thinking') : t('symptomChecker.getAssistance')}
            </button>
          </div>

          {error && (
            <div className="w-full p-4 bg-red-50 border border-red-200 rounded-md mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {isSubmitting && (
            <div className="w-full p-4 bg-gray-50 border border-gray-200 rounded-md mb-6 text-center">
              <p className="text-gray-700">{t('symptomChecker.analyzing')}</p>
            </div>
          )}
          
          {/* Render the HTML response using dangerouslySetInnerHTML */}
          {aiResponse && (
            <div className="w-full p-4 bg-green-50 border border-green-200 rounded-md mb-6">
              <h3 className="text-lg font-medium text-green-800 mb-2">{t('symptomChecker.aiResponse')}</h3>
              <div 
                className="text-green-700 whitespace-pre-line prose" 
                dangerouslySetInnerHTML={{ __html: aiResponse }}
              />
            </div>
          )}

          {(aiResponse || error) && (
            <div className="flex w-full space-x-2">
              <button
                onClick={resetForm}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-300 ease-in-out"
              >
                {t('symptomChecker.checkAnother')}
              </button>
              <button
                onClick={handleFindDoctor}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition duration-300 ease-in-out"
              >
                {t('symptomChecker.findDoctor')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedSymptomChecker;
