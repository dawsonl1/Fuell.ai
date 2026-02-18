import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

/**
 * API endpoint for checking potential duplicate contacts
 * Used by Chrome extension to warn about duplicates before import
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { linkedinUrl, name, email } = await request.json();

    const duplicates = await findPotentialDuplicates(user.id, { linkedinUrl, name, email });
    
    return NextResponse.json({ 
      duplicates: duplicates.matches,
      suggestions: duplicates.suggestions 
    });

  } catch (error) {
    console.error('Duplicate check error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Duplicate check failed' 
    }, { status: 500 });
  }
}

async function findPotentialDuplicates(userId: string, searchData: { linkedinUrl?: string, name?: string, email?: string }) {
  const supabase = await createSupabaseServerClient();
  const matches = [];
  const suggestions = [];

  // Check for exact LinkedIn URL match
  if (searchData.linkedinUrl) {
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('linkedin_url', searchData.linkedinUrl);

    if (data && data.length > 0) {
      matches.push(...data.map(contact => ({
        ...contact,
        matchType: 'exact_linkedin',
        confidence: 100
      })));
    }
  }

  // Check for email match
  if (searchData.email && matches.length === 0) {
    const { data } = await supabase
      .from('contact_emails')
      .select(`
        *,
        contacts!inner(*)
      `)
      .eq('email', searchData.email)
      .eq('contacts.user_id', userId);

    if (data && data.length > 0) {
      matches.push(...data.map(item => ({
        ...item.contacts,
        matchType: 'exact_email',
        confidence: 95
      })));
    }
  }

  // Check for name similarity
  if (searchData.name && matches.length === 0) {
    const names = searchData.name.split(' ').filter(n => n.length > 1);
    
    if (names.length >= 2) {
      // Search for contacts with matching first or last name
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', userId)
        .or(`name.ilike.%${names[0]}%,name.ilike.%${names[names.length - 1]}%`);

      if (data && data.length > 0 && searchData.name) {
        data.filter(contact => contact.name).forEach(contact => {
          const confidence = calculateNameMatchConfidence(searchData.name!, contact.name as string);
          
          if (confidence > 50) {
            matches.push({
              ...contact,
              matchType: 'name_similarity',
              confidence
            });
          }
        });
      }
    }
  }

  // Sort by confidence
  matches.sort((a, b) => b.confidence - a.confidence);

  return {
    matches,
    suggestions: matches.map(match => ({
      id: match.id,
      name: match.name,
      industry: match.industry,
      linkedin_url: match.linkedin_url,
      matchType: match.matchType,
      confidence: match.confidence
    }))
  };
}

function calculateNameMatchConfidence(searchName: string, existingName: string): number {
  const searchNames = searchName.toLowerCase().split(' ').filter(n => n.length > 1);
  const existingNames = existingName.toLowerCase().split(' ').filter(n => n.length > 1);
  
  let matches = 0;
  
  searchNames.forEach(searchName => {
    if (existingNames.some(existingName => 
      existingName.includes(searchName) || searchName.includes(existingName)
    )) {
      matches++;
    }
  });
  
  // Calculate confidence based on name part matches
  const confidence = (matches / Math.max(searchNames.length, existingNames.length)) * 80;
  
  // Bonus for exact matches
  if (searchName.toLowerCase() === existingName.toLowerCase()) {
    return Math.min(confidence + 20, 90); // Cap at 90 for name-only matches
  }
  
  return confidence;
}
