const isMissingEnvFileError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) return false
  if (!("code" in error)) return false
  return (error as { code?: string }).code === "ENOENT"
}

export const loadEnvFileIfPresent = () => {
  try {
    process.loadEnvFile()
  } catch (error) {
    if (!isMissingEnvFileError(error)) {
      throw error
    }
  }
}
