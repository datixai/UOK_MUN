# Builds the editable Word document public/docs/UOKMUN-Delegate-Guide.docx (the "Guide to Delegate Preparation" shown on the Documents page).
# Run: python scripts/make-delegate-guide.py     Requires: python-docx
# The content below is plain Python; edit the text here or open the .docx in Word and edit it there (dates and times are marked "To be announced").
import os, re
from docx import Document
from docx.shared import Pt, Mm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'docs', 'UOKMUN-Delegate-Guide.docx')
os.makedirs(os.path.dirname(OUT), exist_ok=True)
NAVY, GOLD = RGBColor(0x0F, 0x1E, 0x45), RGBColor(0xA8, 0x84, 0x45)
mm, W = 1, 210
TA_CENTER = 'center'; SOFT = 'F4F1E8'; body = 'body'; h2 = 'h2'; small = 'small'; toc1 = None

doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Mm(210), Mm(297)
sec.left_margin = sec.right_margin = Mm(20); sec.top_margin = Mm(22); sec.bottom_margin = Mm(20)
def setfont(st, size, bold=False, color=None, italic=False):
    st.font.name = 'Georgia'; st.font.size = Pt(size); st.font.bold = bold; st.font.italic = italic
    st.element.rPr.rFonts.set(qn('w:eastAsia'), 'Georgia')
    if color is not None: st.font.color.rgb = color
setfont(doc.styles['Normal'], 10.5)
setfont(doc.styles['Heading 1'], 20, True, NAVY); setfont(doc.styles['Heading 2'], 12.5, True, GOLD)
doc.styles['Heading 1'].paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
doc.styles['Heading 1'].paragraph_format.space_after = Pt(10)
doc.styles['Heading 2'].paragraph_format.space_before = Pt(10); doc.styles['Heading 2'].paragraph_format.space_after = Pt(3)
setfont(doc.styles['List Bullet'], 10.5)

def fld(par, code):
    for t, txt in (('begin', None), (None, code), ('separate', None), ('text', 'Right-click and choose Update field to build the contents.'), ('end', None)):
        r = par.add_run()
        if t in ('begin', 'separate', 'end'):
            e = OxmlElement('w:fldChar'); e.set(qn('w:fldCharType'), t); r._r.append(e)
        elif t == 'text': r.text = txt
        else:
            e = OxmlElement('w:instrText'); e.set(qn('xml:space'), 'preserve'); e.text = txt; r._r.append(e)
def runs(par, text, base_bold=False, base_italic=False, color=None, size=None):
    text = text.replace('&nbsp;', '\u00a0').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    b, i, u = base_bold, base_italic, False
    for tok in re.split(r'(<[^>]+>)', text):
        if tok in ('<b>',): b = True
        elif tok == '</b>': b = base_bold
        elif tok == '<i>': i = True
        elif tok == '</i>': i = base_italic
        elif tok == '<u>': u = True
        elif tok == '</u>': u = False
        elif tok.startswith('<br'): par.add_run().add_break()
        elif tok.startswith('<'): pass
        elif tok:
            r = par.add_run(tok); r.bold = b; r.italic = i; r.underline = u
            if color is not None: r.font.color.rgb = color
            if size: r.font.size = Pt(size)
def shade(cell, hexcolor):
    tcPr = cell._tc.get_or_add_tcPr(); s = OxmlElement('w:shd'); s.set(qn('w:val'), 'clear'); s.set(qn('w:color'), 'auto'); s.set(qn('w:fill'), hexcolor); tcPr.append(s)
def borders(tbl, color='C9C4B4'):
    tblPr = tbl._tbl.tblPr; b = OxmlElement('w:tblBorders')
    for k in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        e = OxmlElement('w:' + k); e.set(qn('w:val'), 'single'); e.set(qn('w:sz'), '4'); e.set(qn('w:color'), color); b.append(e)
    tblPr.append(b)

def ParagraphStyle(name, **kw): return 'center'
def Spacer(a, b): return None
def NextPageTemplate(x): return None
def PageBreak(): doc.add_page_break(); return None
class TableOfContents: levelStyles = []; dotsMinLevel = 0
def P(t, s=body):
    par = doc.add_paragraph()
    par.paragraph_format.space_after = Pt(6)
    if s == 'center': par.alignment = WD_ALIGN_PARAGRAPH.CENTER; runs(par, t, color=NAVY, size=13)
    elif s == small: runs(par, t, size=9, base_italic=False)
    elif s == h2: par.style = doc.styles['Heading 2']; runs(par, t)
    else: par.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY; runs(par, t)
    return None
def B(items):
    for t in items:
        par = doc.add_paragraph(style='List Bullet'); par.paragraph_format.space_after = Pt(2); runs(par, t)
    return []
def H1(t):
    if t.startswith('TABLE OF CONTENTS'):
        par = doc.add_paragraph(); par.alignment = WD_ALIGN_PARAGRAPH.CENTER; r = par.add_run(t); r.bold = True; r.font.size = Pt(20); r.font.color.rgb = NAVY
        fld(doc.add_paragraph(), 'TOC \\o "1-1" \\h \\z \\u'); return None
    doc.add_heading(t, level=1); return None
def box(title, lines, color=SOFT):
    t = doc.add_table(rows=1, cols=1); t.alignment = WD_TABLE_ALIGNMENT.CENTER; borders(t, 'A88445')
    c = t.rows[0].cells[0]; shade(c, color); first = c.paragraphs[0]; runs(first, '<b>%s</b>' % title)
    for l in lines:
        par = c.add_paragraph(); par.paragraph_format.space_after = Pt(3); runs(par, l)
    doc.add_paragraph().paragraph_format.space_after = Pt(2); return []
def table(rows, widths, head=True):
    t = doc.add_table(rows=len(rows), cols=len(rows[0])); t.alignment = WD_TABLE_ALIGNMENT.CENTER; borders(t); t.autofit = False
    for ri, r in enumerate(rows):
        for ci, v in enumerate(r):
            c = t.rows[ri].cells[ci]; c.width = Mm(widths[ci]); par = c.paragraphs[0]
            if head and ri == 0: shade(c, '0F1E45'); runs(par, str(v), base_bold=True, color=RGBColor(255, 255, 255), size=9.5)
            else: runs(par, str(v), size=9.5)
    doc.add_paragraph().paragraph_format.space_after = Pt(2); return []

# ----- cover page
lg = os.path.join(ROOT, 'public', 'logo.png')
par = doc.add_paragraph(); par.alignment = WD_ALIGN_PARAGRAPH.CENTER; par.paragraph_format.space_before = Pt(50); par.add_run().add_picture(lg, width=Mm(55))
for txt, sz, col, bold, gap in (('Guide to Delegate Preparation', 32, NAVY, True, 40), ('University of Kotli Model United Nations', 16, GOLD, False, 6), ('Department of International Relations, University of Kotli, Azad Jammu and Kashmir', 11, NAVY, False, 4), ('Dates, times and venue: to be announced', 11, NAVY, False, 40)):
    par = doc.add_paragraph(); par.alignment = WD_ALIGN_PARAGRAPH.CENTER; par.paragraph_format.space_before = Pt(gap); r = par.add_run(txt); r.bold = bold; r.font.size = Pt(sz); r.font.color.rgb = col
# footer with page number
fp = sec.footer.paragraphs[0]; fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = fp.add_run('UOK MUN | Guide to Delegate Preparation | Page '); r.font.size = Pt(8.5)
fld(fp, 'PAGE')
st = doc.settings.element; uf = OxmlElement('w:updateFields'); uf.set(qn('w:val'), 'true'); st.append(uf)  # Word refreshes the contents when the file is opened

S = [NextPageTemplate('main'), PageBreak()]
toc = TableOfContents(); toc.levelStyles = [toc1]; toc.dotsMinLevel = 0
S += [H1('TABLE OF CONTENTS'), toc, PageBreak()]

# ---------------- Welcome letter
S += [H1('WELCOME FROM THE SECRETARIAT'), P('Dear Delegates and Faculty Advisors,'),
 P('Welcome to UOK MUN, the Model United Nations conference of the University of Kotli. If you are reading this guide, you are about to take part in a simulation where students become diplomats, argue for the interests of a country or a person, and work with others to find solutions to real problems.'),
 P('This guide has one purpose: to help you arrive ready. It explains how the United Nations works, how our conference is organised, how to research and prepare, how to speak and negotiate, and how to follow the rules of procedure. It also includes samples of the documents you will write: a position paper, a working paper, a draft resolution, a directive and a crisis note.'),
 P('If this is your first Model UN, read the whole guide once and then keep the Rules of Procedure and the sample documents next to you while you prepare. If you are experienced, pay special attention to the sections on awards and conduct, because our policies are written for our own conference.'),
 P('Remember that you, the delegates, make the conference. The staff provide the framework and the rules, but the quality of the debate depends on your research, your courage to speak and your respect for others. If you have a question about your committee, ask your Chair. For anything about registration or logistics, contact the organisers using the details at the end of this guide.'),
 P('We wish you every success and look forward to seeing you at UOK MUN.'), Spacer(1, 6), P('Sincerely,'), P('<b>The Secretariat</b><br/>University of Kotli Model United Nations'), PageBreak()]

# ---------------- UN structure
S += [H1('THE STRUCTURE OF THE UNITED NATIONS'),
 P('The United Nations (UN) was founded in 1945, in the aftermath of the Second World War, by countries that wanted to prevent another global conflict. Its Charter sets out four main purposes: to maintain international peace and security; to develop friendly relations among nations based on equal rights and self-determination; to achieve international cooperation in solving economic, social, cultural and humanitarian problems and in promoting human rights; and to be a centre for harmonising the actions of nations toward these goals.'),
 P('The UN rests on a few principles that every delegate should remember: all member states are sovereign and equal, they must fulfil in good faith the obligations they accepted, disputes should be settled by peaceful means, and the organisation should not intervene in matters that are essentially within the domestic jurisdiction of a state.'),
 P('The UN has six principal organs:', body)]
S += table([['Organ', 'What it does'],
 ['General Assembly (GA)', 'All 193 member states have one vote. It discusses any issue within the Charter, makes recommendations and approves the budget. Its resolutions are not binding, but they carry the moral weight of the international community.'],
 ['Security Council (SC)', 'Responsible for international peace and security. It has fifteen members: five permanent members (China, France, Russia, the United Kingdom and the United States) with the power of veto, and ten elected members. It can impose sanctions and authorise the use of force, and its decisions are binding.'],
 ['Economic and Social Council (ECOSOC)', 'Coordinates economic and social work, including many commissions and agencies. It studies issues, makes recommendations and prepares drafts for the General Assembly.'],
 ['Secretariat', 'The administrative arm of the UN, led by the Secretary-General. It runs peacekeeping logistics, studies, and day-to-day operations.'],
 ['International Court of Justice (ICJ)', 'Settles legal disputes between states and gives advisory opinions on legal questions.'],
 ['Trusteeship Council', 'Supervised territories not yet self-governing. It suspended operations in 1994 and is not normally simulated.']], [48 * mm, W - 40 * mm - 48 * mm])
S += [P('Besides these organs, the UN family includes specialised agencies, funds and programmes such as UNICEF, the World Health Organization and the UN High Commissioner for Refugees, and regional organisations such as the Organisation of Islamic Cooperation (OIC) work alongside it. Knowing which body has the power to act on your topic is a large part of good diplomacy: a delegate who proposes something the committee has no authority to do will lose credibility quickly.'), PageBreak()]

# ---------------- UOK MUN structure
S += [H1('THE STRUCTURE OF UOK MUN'),
 P('UOK MUN is a Model United Nations conference organised by students of the University of Kotli, Azad Jammu and Kashmir. Delegates are assigned to a committee and a country, portfolio or personality, and represent that position in debate. The conference includes the following committees:')]
S += table([['Committee', 'Full name', 'Type'],
 ['UNSC', 'United Nations Security Council', 'UN organ'],
 ['UNHRC', 'United Nations Human Rights Council', 'UN body'],
 ['OIC', 'Organisation of Islamic Cooperation', 'Regional organisation'],
 ['PNA', 'Pakistan National Assembly', 'National parliament'],
 ['UNCSW', 'UN Commission on the Status of Women', 'UN commission'],
 ['UNGA (Junior)', 'Junior General Assembly, for FSc and Intermediate students', 'Junior committee'],
 ['Crisis Cell', 'Crisis Cell, with a scenario kept secret until the session', 'Crisis committee']], [32 * mm, 100 * mm, W - 40 * mm - 132 * mm])
S += [P('Each committee is led by a dais. The dais members are:'),
 *B(['<b>The Chair</b>, the procedural leader who runs formal sessions, recognises speakers, rules on motions and keeps the debate orderly.',
     '<b>The Vice Chair</b>, who assists the Chair, keeps the speakers list and helps delegates with questions.',
     '<b>The Rapporteur or Secretary</b>, who records the proceedings, collects notes and documents, and helps the dais with paperwork.']),
 P('Above the committees sits the Secretariat, led by the Secretary-General, together with the Director General Registration, who is responsible for registration and delegate affairs. The Secretariat sets the conference policies described in this guide and announces the awards at the closing ceremony.'),
 P('After registration is approved, you will receive an access code and can sign in to the delegate portal on the UOK MUN website. The portal shows your committee, your country or position, the chairs, the other delegates in your committee and the schedule. Only members of your own committee can see this information.'), PageBreak()]

# ---------------- Conference information
S += [H1('CONFERENCE INFORMATION'), P('Schedule', h2),
 P('<b>The dates, times and venues of UOK MUN are not final yet.</b> They will be announced by the Secretariat and published on the Schedule page of the website and in the delegate portal. This guide is an editable document and will be updated when the schedule is confirmed. The outline below shows the usual flow of the days.'),
 *box('Conference dates', ['Dates: <b>To be announced</b>', 'Venue: <b>To be announced</b> (University of Kotli, Azad Jammu and Kashmir)', 'Registration deadline: <b>To be announced</b>', 'Position paper deadline: <b>To be announced</b>']),
 *table([['Day', 'Date', 'Time', 'Programme'],
  ['Day 1', 'To be announced', 'To be announced', 'Registration and opening ceremony. Committee session I.'],
  ['Day 2', 'To be announced', 'To be announced', 'Committee session II and lobbying. Working papers and blocs form.'],
  ['Day 3', 'To be announced', 'To be announced', 'Final session, resolutions and voting. Closing ceremony and awards.']], [18 * mm, 32 * mm, 32 * mm, W - 40 * mm - 82 * mm]),
 P('Dress code', h2),
 P('UOK MUN is a professional simulation, so delegates dress formally during all sessions and ceremonies. A suit or blazer with a collared shirt, or a formal shalwar kameez or national dress, is appropriate. Casual clothing, sportswear and offensive slogans are not allowed. Delegates who are dressed inappropriately may be asked to change before they can enter the committee room.'),
 P('Conduct', h2),
 P('Treat everyone with respect: delegates, chairs, staff, guests and the university community. Harassment, discrimination, offensive language and disruption of sessions are not tolerated. Follow the instructions of the staff and the rules of the university. Mobile phones should be silent during sessions, and electronic devices may be used only for conference work and only if the Chair allows it.'),
 P('Awards policy', h2),
 P('UOK MUN is first of all about learning: public speaking, research, negotiation and teamwork. We also recognise delegates who contributed in an exceptional way. At the closing ceremony the Secretariat announces the individual awards, which are decided by the Chairs of each committee together with the Secretariat. There are three categories:'),
 *table([['Award', 'Meaning'],
  ['Best Delegate (BD)', 'The delegate who leads the committee with the strongest research, speeches and results.'],
  ['Outstanding Diplomacy (OD)', 'The delegate who shows the best negotiation, teamwork and respect for others.'],
  ['Special Mention (SM)', 'Delegates who made a strong and memorable contribution to the committee.']], [55 * mm, W - 40 * mm - 55 * mm]),
 P('When deciding awards, the Chairs look at the following:'),
 *B(['Ability to work with and persuade other delegates through clear explanations and sound arguments.',
     'Quality of the position paper and attendance at every session.',
     'Faithfulness to the policy of the assigned country or person while still showing willingness to compromise.',
     'Ability to develop practical solutions and to express them in speech and in writing.',
     'Depth of understanding of the topic.',
     'Skill in caucusing, writing resolutions and debating, and respect for the rules and for others.']),
 P('The number of awards in each committee depends on the number of delegates, and the Secretariat may adjust it. Certificates are issued to the award winners and to the participants.'), PageBreak()]

# ---------------- Policies
S += [H1('CONFERENCE POLICIES'), P('Pre-writing policy', h2),
 P('The strength of Model UN is that ideas are developed in the room, through debate and cooperation. Working papers, draft resolutions and directives must be written during the conference. Only the position paper may be prepared beforehand. Documents that appear to have been written before the conference will not be accepted by the dais, and delegates who submit pre-written work may lose their eligibility for awards.'),
 P('Plagiarism policy', h2),
 P('It is natural to use other people\'s ideas and facts, but you must show clearly when you do. All material that you submit must be your own work, and quoted or paraphrased material must be cited. Plagiarism includes:'),
 *B(['<b>Copying</b> the words of another delegate or an outside source without credit.',
     '<b>Weak paraphrasing</b>, which means adapting the ideas of a source without saying where they came from.',
     '<b>Reusing</b> work you submitted before in another class or conference.']),
 P('Suspected plagiarism is reported to the Secretariat and may lead to losing award eligibility, removal from the conference or a report to your institution. If you are not sure whether something needs a citation, ask your Chair.'),
 P('Use of artificial intelligence', h2),
 P('Delegates may use AI tools to understand a concept in the same way they would use a textbook, but the work they submit and the speeches they give must be their own thinking and their own words. Position papers, speeches, working papers, draft resolutions and directives must not be written or rewritten by an AI tool, and facts taken from an AI tool must be checked against a reliable source. Delegates found submitting AI-written work may be disqualified from awards at the discretion of the Chair and the Secretariat.'),
 P('Delegate safety and welfare', h2),
 P('If you feel unsafe, are treated unfairly, or see behaviour that worries you, tell any Chair or a member of the Secretariat. Reports are treated seriously and privately.'), PageBreak()]

# ---------------- Preparation
S += [H1('CONFERENCE PREPARATION'),
 P('Good preparation has three parts. <b>Functional preparation</b> means knowing the rules and tools needed to take part. <b>Substantive preparation</b> means understanding the topic. <b>Positional preparation</b> means adopting the viewpoint of your country or person, which may be very different from your own. This guide, the background guide of your committee and your own research together cover all three.'),
 P('Step 1: Learn your committee', h2),
 P('Find out what your committee is, who its members are, what powers it has and what it can and cannot do. A resolution from the Security Council can be binding, while a General Assembly or Human Rights Council resolution is a recommendation. Knowing this will keep your proposals realistic.'),
 P('Step 2: Understand the topic', h2),
 P('Read the background guide first. Then research the history of the issue, the key terms, the main actors, the legal framework and past UN action. Useful sources are the UN website and documents (un.org), the committee\'s own pages, UN treaty and resolution databases, reports of the World Bank and of UN agencies, and respected news organisations and research institutes. Keep a list of the sources you use so that you can cite them.'),
 P('Step 3: Research your country or position', h2),
 P('Study the foreign policy of your country: its history on the topic, its allies and opponents, its interests, its votes and statements at the UN, and its domestic situation. For a personality, study the role, the party or institution, public statements and positions. Prepare answers to these questions:'),
 *B(['What is my position, and what are the reasons for it?', 'Which countries or members agree with me, and which will oppose me?', 'What can I offer in a compromise, and what is a red line I cannot cross?', 'What solutions have been tried before and what happened?', 'What facts and numbers support my position?']),
 P('Step 4: Write your position paper', h2),
 P('The position paper is a short, clear statement (usually one page) of your position. It shows the Chair that you are ready. See the sample later in this guide. Send it to your Chair by the date announced by the Secretariat.'),
 P('Step 5: Prepare for the room', h2),
 P('Prepare a one-minute opening speech, three points that you want to make, a list of countries to approach, and ideas for a clause or two that you could write into a resolution. Practise speaking clearly and within the time limit.'), PageBreak()]

# ---------------- Committee dynamics
S += [H1('COMMITTEE DYNAMICS'),
 P('A committee session moves through stages. Understanding them helps you know when to speak and when to negotiate.'),
 *table([['Stage', 'What happens'],
  ['Roll call and setting the agenda', 'The Chair calls the roll. Delegates then vote on which agenda item to discuss first.'],
  ['Formal debate (speakers list)', 'Delegates give prepared speeches in order. Use this to state your position and to recruit support.'],
  ['Moderated caucus', 'A structured discussion on a narrower subtopic. Delegates are recognised by the Chair and speak for a short time each.'],
  ['Unmoderated caucus', 'Delegates leave their seats to talk freely, form blocs and write working papers.'],
  ['Working papers', 'Groups of delegates write their ideas down. A working paper may be introduced to the committee for discussion.'],
  ['Draft resolutions', 'A working paper with the required number of sponsors and signatories becomes a draft resolution.'],
  ['Amendments and voting', 'The committee may amend a draft resolution, then votes on it. Passing a resolution is the formal outcome of the committee.']], [50 * mm, W - 40 * mm - 50 * mm]),
 P('Blocs and sponsors', h2),
 P('Countries with similar goals form blocs. <b>Sponsors</b> are the delegates who write a draft resolution and agree with all of its content. <b>Signatories</b> are delegates who do not necessarily agree with it, but wish to see it discussed. A good bloc is inclusive: the more regions and views it contains, the more likely its resolution is to pass.'),
 P('Crisis committees', h2),
 P('In the Crisis Cell the situation changes during the session. The Chair announces new developments, and delegates respond by writing directives and crisis notes. The scenario remains secret until the session begins, so prepare by understanding your character, your resources and your allies, and be ready to think and act quickly.'),
 P('Working with the dais', h2),
 P('The dais is there to help you. Send a note to the Chair if you have a question about procedure. Do not argue with a ruling during the session. If you disagree, you may use the points and appeals described in the Rules of Procedure, or speak with the Chair afterwards.'), PageBreak()]

# ---------------- Communication
S += [H1('THE ART OF COMMUNICATION'),
 P('Public speaking', h2),
 P('A strong speech has a clear opening, two or three points and a closing. Begin by addressing the Chair and the committee. State your position in the first sentence, support it with facts, and end with a call for action. Speak slowly, look at the committee instead of your paper, and finish within the time you are given. Silence for a second after a key point is more powerful than rushing.'),
 *box('A simple speech outline', ['1. Address: "Honourable Chair, distinguished delegates."', '2. Position: say what your country wants to achieve.', '3. Evidence: one fact, one example, one past action.', '4. Proposal: the solution you support.', '5. Close: invite others to work with you.']),
 P('Diplomatic language', h2),
 P('Diplomats are polite even when they strongly disagree. Refer to your country in the third person ("The delegation of Pakistan believes...") or use "we" for your delegation, and never use "I". Prefer measured phrases such as "the delegation is concerned by" instead of personal attacks. Do not call another country a liar. Instead say "the delegation questions the accuracy of that statement."'),
 P('Negotiation and lobbying', h2),
 *B(['Listen first. Ask what the other delegate needs before you explain what you need.', 'Look for shared interests and build on them.', 'Be ready to compromise on the details while keeping your main goals.', 'Be honest and keep your promises, because your reputation lasts for the entire conference.', 'Speak to quieter delegates too. A delegate who has not yet spoken can be an important ally.']),
 P('Notes and writing', h2),
 P('Passing notes to other delegates or to the dais is a useful way to communicate quietly. Keep notes short, polite and about the topic. Written documents must be clear, short sentences with a formal tone. Check spelling and make sure that every sentence has a single idea.'), PageBreak()]

# ---------------- Rules of procedure
S += [H1('RULES OF PROCEDURE'),
 P('The Rules of Procedure keep the debate fair and orderly. The Chair has the authority to interpret them, and the Chair\'s decision is final during the session unless the committee overrules it through an appeal. The rules below apply to all committees unless the Chair announces a change for a special committee.'),
 P('Quorum and voting', h2),
 *B(['A quorum is a simple majority of the members registered to the committee. Debate can start when it is present.', 'A simple majority is more than half of the members present and voting. A two-thirds majority is needed for some motions.', 'Delegates may vote yes, no or abstain on substantive votes. On procedural votes, abstentions are not allowed.']),
 P('Points', h2),
 *table([['Point', 'Use'],
  ['Point of personal privilege', 'To raise a problem about your comfort, such as not hearing the speaker or the room temperature. It may interrupt a speaker only for audibility.'],
  ['Point of order', 'To say that the Rules of Procedure were not followed correctly.'],
  ['Point of parliamentary inquiry', 'To ask the Chair a question about the rules or the status of the debate.'],
  ['Point of information', 'To ask a question of a speaker after a speech, if the speaker agrees and the Chair allows it.']], [58 * mm, W - 40 * mm - 58 * mm]),
 P('Motions', h2),
 P('A motion is a request to the committee to do something. The Chair asks for the motions, then votes on them in order of disruptiveness. The most common motions are:'),
 *table([['Motion', 'Purpose', 'Majority'],
  ['To open or close the speakers list', 'Start or end the list of speakers', 'Simple'],
  ['To set the agenda', 'Choose which topic is discussed first', 'Simple'],
  ['For a moderated caucus', 'Structured debate on a subtopic (state topic, total time and speaking time)', 'Simple'],
  ['For an unmoderated caucus', 'Free discussion and writing (state the total time)', 'Simple'],
  ['To introduce a working paper or draft resolution', 'Present it to the committee', 'Simple, with sponsors'],
  ['To suspend or adjourn the meeting', 'Break for a time, or end the session', 'Simple'],
  ['To close debate', 'End debate on the topic and move to voting', 'Two-thirds'],
  ['To divide the question', 'Vote on parts of the resolution separately', 'Simple'],
  ['To table or reconsider', 'Postpone, or bring back a matter already decided', 'Two-thirds']], [58 * mm, 76 * mm, W - 40 * mm - 134 * mm]),
 P('Amendments', h2),
 P('An amendment changes a draft resolution. A <b>friendly amendment</b> is accepted by all of the sponsors and is added at once. An <b>unfriendly amendment</b> is not accepted by all sponsors, needs a certain number of signatories and is voted on by the committee.'),
 P('Voting procedure', h2),
 P('When debate is closed, the committee votes on the draft resolutions in the order they were introduced. During a vote nobody may enter or leave the room, and nobody may speak except for points of order. The Chair counts the votes by show of placards or by roll call. A resolution passes with the required majority.'), PageBreak()]

# ---------------- Samples
S += [H1('SAMPLE POSITION PAPER'),
 *box('Committee: United Nations Human Rights Council  |  Delegation: Canada (example)  |  Topic: Protecting peaceful protest', [
  '<b>Background.</b> Peaceful assembly is protected by Article 20 of the Universal Declaration of Human Rights and Article 21 of the International Covenant on Civil and Political Rights. In recent years, many states have used counter-terrorism and public-order laws in ways that limit protest, and special rapporteurs have reported detentions and the use of excessive force.',
  '<b>Past international action.</b> The Human Rights Council adopted resolutions on the promotion and protection of human rights in the context of peaceful protest, and the Human Rights Committee issued General Comment 37 on the right of peaceful assembly.',
  '<b>Position of the delegation.</b> Canada believes that restrictions on assembly must be lawful, necessary and proportionate, and that national security must not be used to silence legitimate dissent. Canada has supported all Council resolutions on this subject and funds training of police officers on human rights standards.',
  '<b>Proposed solutions.</b> Canada proposes that member states (1) review their security laws to remove vague definitions, (2) publish clear guidelines on the use of force during demonstrations, (3) support independent monitoring by national human rights institutions, and (4) share best practices through a voluntary annual report to the Council.'], SOFT),
 P('<i>This is an example only. Keep your own paper to one page, use short paragraphs, state facts with a source, and always end with concrete proposals.</i>', small),
 H1('SAMPLE WORKING PAPER'),
 *box('Working Paper 1.1  |  Sponsors: Canada, Ghana, Brazil  |  Topic: Protecting peaceful protest', [
  'The committee should consider the following ideas:',
  '1. Review of national laws on assembly and counter-terrorism for clear definitions;',
  '2. National guidelines on the use of force by police during demonstrations;',
  '3. Independent monitoring of demonstrations by national human rights institutions;',
  '4. A voluntary annual report to the Council on best practices;',
  '5. Funding for training of security forces.'], SOFT),
 P('<i>A working paper is informal. It has no required format and shows the ideas of a group. It becomes a draft resolution only when it is turned into the official format and introduced to the committee.</i>', small), PageBreak()]

S += [H1('SAMPLE DRAFT RESOLUTION'),
 *box('Draft Resolution 1.1  |  Human Rights Council  |  Sponsors: Canada, Ghana, Brazil  |  Signatories: Chile, Japan, Kenya', [
  '<i>The Human Rights Council,</i>',
  '<i>Reaffirming</i> Article 20 of the Universal Declaration of Human Rights,',
  '<i>Recalling</i> General Comment 37 of the Human Rights Committee on the right of peaceful assembly,',
  '<i>Deeply concerned</i> by reports of excessive force against peaceful demonstrators,',
  '<i>Recognising</i> the legitimate duty of states to protect public order and safety,',
  '1. <u>Urges</u> member states to review national laws on assembly and counter-terrorism so that definitions are clear and restrictions are necessary and proportionate;',
  '2. <u>Encourages</u> the adoption of national guidelines on the use of force during demonstrations, including:',
  '&nbsp;&nbsp;&nbsp;&nbsp;a. clear rules on warnings before force is used,',
  '&nbsp;&nbsp;&nbsp;&nbsp;b. the principle that force must be a last resort;',
  '3. <u>Invites</u> national human rights institutions to monitor demonstrations independently;',
  '4. <u>Requests</u> member states to share best practices through a voluntary annual report to the Council;',
  '5. <u>Decides</u> to remain seized of the matter.'], SOFT),
 P('Formatting guidelines for resolutions', h2),
 *B(['The resolution is one long sentence: the preamble clauses end with commas and the operative clauses end with semicolons, except the last one, which ends with a full stop.',
     'Preambular clauses begin with an italic phrase such as <i>Recalling, Noting, Concerned, Recognising, Reaffirming, Bearing in mind</i>.',
     'Operative clauses are numbered and begin with an underlined verb such as <u>Urges, Encourages, Calls upon, Requests, Invites, Decides</u>. Sub-clauses use letters (a, b, c) and then roman numerals (i, ii, iii).',
     'Name the body, the sponsors and the signatories at the top.',
     'An operative clause should say <i>who</i> does <i>what</i>, and be realistic for the power of the committee.',
     'Do not repeat the same operative verb in the following clause.']), PageBreak()]

S += [H1('SAMPLE DIRECTIVE AND CRISIS NOTE'),
 P('Directive (Crisis Cell)', h2),
 *box('Directive 1  |  From: Delegate of the Ministry of Interior (example character)', [
  '<b>Action.</b> The ministry orders the deployment of three emergency medical teams to the affected district and asks the national relief authority to open two supply routes.',
  '<b>Resources.</b> Existing ministry vehicles, the national relief reserve.',
  '<b>Timeline.</b> Teams depart within six hours and report back every twelve hours.',
  '<b>Expected result.</b> Medical care and food reach the district within one day, and the number of casualties is reduced.'], SOFT),
 P('A directive is a short written order that moves the crisis forward. It must be realistic: say what you will do, who will do it, with what resources and how long it takes. The Crisis Chair may approve it, change it or reject it depending on what the scenario allows.'),
 P('Crisis note (private message to the crisis staff)', h2),
 *box('Crisis Note  |  From: Delegate of the Ministry of Interior', [
  'I would like to know whether there are any reports of damage to the main bridge on the northern road. If the road is closed, my ministry will use the railway line to move supplies. Please also tell me whether the telephone network is working in the district.'], SOFT),
 P('A crisis note is a private message from a delegate to the crisis staff to ask a question, gather information or act in secret. It is written in the first person, is short and clear, and stays within the powers of your character.'), PageBreak()]

# ---------------- Checklist + contacts
S += [H1('DELEGATE CHECKLIST'),
 *B(['Read this guide and the background guide of your committee.', 'Learn the Rules of Procedure and the basic motions.', 'Research your country or position, and write your position paper.', 'Prepare a one-minute opening speech.', 'Plan your outfit and bring formal attire.', 'Bring a copy of your position paper, a pen, notebook, your ID and a water bottle.', 'Sign in to the delegate portal to see your committee and schedule.', 'Arrive early, be polite and enjoy the experience.']),
 H1('CONTACT'),
 P('For any question about registration, your committee or the conference, contact the organising team.'),
 *table([['Contact', 'Details'], ['Email', 'uokmun4@gmail.com'], ['Website', 'https://uok-mun.vercel.app'], ['Portal', 'https://uok-mun.vercel.app/delegate']], [40 * mm, W - 40 * mm - 40 * mm]),
 P('The names and WhatsApp numbers of the organisers are listed on the Contact section of the website.', small),
 Spacer(1, 18), P('<b>Good luck, delegates.</b>', ParagraphStyle('x', parent=body, alignment=TA_CENTER, fontSize=13, textColor=NAVY))]


doc.save(OUT)
print('written', OUT)
