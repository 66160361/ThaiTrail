<?php

class TextUtility
{
    /**
     * Clean and decode HTML entities in a text, and normalize spaces.
     *
     * @param string|null $text
     * @return string|null
     */
    public static function cleanText(?string $text): ?string
    {
        if ($text === null) {
            return null;
        }
        
        // Decode HTML entities (e.g. &ldquo;, &rdquo;, &nbsp;, &quot;, &amp;)
        $decoded = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        
        // Replace non-breaking spaces (U+00A0) with standard spaces
        $decoded = str_replace("\xc2\xa0", ' ', $decoded);
        
        // Replace multiple consecutive spaces with a single space
        $decoded = preg_replace('/\s+/u', ' ', $decoded);
        
        return trim($decoded);
    }
}
