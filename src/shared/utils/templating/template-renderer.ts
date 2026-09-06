import { sprightly } from 'sprightly'
import type { Data } from 'sprightly'

export const renderTemplate = (templatePath: string, data: Data): string => sprightly(templatePath, data)
