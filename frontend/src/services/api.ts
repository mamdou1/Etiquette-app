import axios from "axios";
import { LabelRecord, UploadResponse } from "../types";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export const uploadExcel = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axios.post<UploadResponse>(
    `${API_URL}/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};