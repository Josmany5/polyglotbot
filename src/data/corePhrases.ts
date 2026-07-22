// Core Phrase Library — 1000 frequency-ordered English phrases across 40 packs of 25
// These are the same English phrases for every target language.
// Each pack unlocks progressively more vocabulary while building on previous packs.

export interface CorePhrase { id: string; english: string; }

export interface CorePack {
  packNumber: number;
  title: string;
  description: string;
  phrases: CorePhrase[];
}

function pack(n: number, title: string, desc: string, phrases: string[]): CorePack {
  return {
    packNumber: n,
    title: `Pack ${n}: ${title}`,
    description: desc,
    phrases: phrases.map((english, i) => ({
      id: `core-${String(n * 25 - 25 + i + 1).padStart(4, '0')}`,
      english,
    })),
  };
}

// Helper: 25-item pack
const p = pack;

export const CORE_PACKS: CorePack[] = [
  p(1, 'Essential First 25', 'The phrases you need for your very first conversation.', [
    'Hello', 'Goodbye', 'Yes', 'No', 'Please',
    'Thank you', 'You are welcome', 'Excuse me', 'I am sorry', 'How are you?',
    'I am fine', 'What is your name?', 'My name is...', 'Nice to meet you', 'Where are you from?',
    'I am from...', 'I do not understand', 'Can you repeat that?', 'Do you speak English?', 'I speak a little',
    'How much does it cost?', 'Where is the bathroom?', 'Help!', 'I need...', 'Okay',
  ]),
  p(2, 'Daily Basics', 'Everyday words for daily life.', [
    'Today', 'Tomorrow', 'Yesterday', 'Now', 'Later',
    'Here', 'There', 'This', 'That', 'Big',
    'Small', 'Good', 'Bad', 'More', 'Less',
    'Water', 'Food', 'I am hungry', 'I am thirsty', 'I am tired',
    'Wait', 'Again', 'Maybe', 'Of course', 'No problem',
  ]),
  p(3, 'People & Interactions', 'Words for people and social situations.', [
    'Man', 'Woman', 'Child', 'Friend', 'Family',
    'I', 'You', 'He', 'She', 'We',
    'They', 'Sir', 'Ma\'am', 'Come here', 'Let us go',
    'I like you', 'I love you', 'See you later', 'Take care', 'Congratulations',
    'Happy birthday', 'Good luck', 'What is wrong?', 'I am sorry to hear that', 'Can I help you?',
  ]),
  p(4, 'Getting Things Done', 'Action words and requests.', [
    'I want...', 'I would like...', 'Can I have...?', 'Give me...', 'Take this',
    'Bring me...', 'Open the door', 'Close the window', 'Turn on the light', 'Turn off the light',
    'Sit down', 'Stand up', 'Listen to me', 'Look at this', 'I am looking for...',
    'I found it', 'I lost it', 'Write it down', 'Read this', 'Call me',
    'Send me a message', 'I am going to...', 'I came from...', 'I will be right back', 'Wait for me',
  ]),
  p(5, 'Time & Numbers', 'Tell time, count, and talk about when.', [
    'One', 'Two', 'Three', 'Four', 'Five',
    'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Twenty', 'Thirty', 'Hundred', 'Thousand', 'What time is it?',
    'It is three o\'clock', 'Morning', 'Afternoon', 'Evening', 'Night',
    'Always', 'Never', 'Sometimes', 'Often', 'How long?',
  ]),
  p(6, 'Describing Things', 'Adjectives to describe the world.', [
    'New', 'Old', 'Young', 'Beautiful', 'Ugly',
    'Happy', 'Sad', 'Hot', 'Cold', 'Fast',
    'Slow', 'Easy', 'Difficult', 'Same', 'Different',
    'Full', 'Empty', 'Clean', 'Dirty', 'Expensive',
    'Cheap', 'Right', 'Wrong', 'Possible', 'Impossible',
  ]),
  p(7, 'Connecting Ideas', 'Words that connect sentences.', [
    'And', 'But', 'Or', 'Because', 'So',
    'If', 'When', 'Then', 'Also', 'However',
    'For example', 'In my opinion', 'I think that...', 'I believe that...', 'It depends',
    'With', 'Without', 'For', 'From', 'To',
    'In', 'On', 'At', 'Between', 'Until',
  ]),
  p(8, 'Feelings & Opinions', 'Express how you feel and what you think.', [
    'I feel...', 'I agree', 'I disagree', 'That is great', 'That is terrible',
    'Interesting', 'Boring', 'Funny', 'Serious', 'Important',
    'Strange', 'I am afraid', 'I am excited', 'I am surprised', 'I am confused',
    'I am bored', 'I am worried', 'I am angry', 'Calm down', 'Do not worry',
    'It does not matter', 'I do not care', 'I prefer...', 'I hope so', 'I doubt it',
  ]),
  p(9, 'Travel & Movement', 'Navigate places and get around.', [
    'Where is...?', 'How do I get to...?', 'Left', 'Right', 'Straight ahead',
    'Near', 'Far', 'Airport', 'Train station', 'Bus stop',
    'Hotel', 'Hospital', 'Police station', 'Pharmacy', 'Restaurant',
    'Store', 'Bank', 'I am lost', 'Can you show me on the map?', 'How far is it?',
    'On foot', 'By car', 'By bus', 'A ticket please', 'What time does it leave?',
  ]),
  p(10, 'Food & Drink', 'Order food, describe tastes.', [
    'I would like to order', 'The menu please', 'What do you recommend?', 'I am allergic to...', 'Without...',
    'Bread', 'Meat', 'Chicken', 'Fish', 'Rice',
    'Vegetables', 'Fruit', 'Coffee', 'Tea', 'Beer',
    'Wine', 'Delicious', 'Spicy', 'Sweet', 'Salty',
    'The check please', 'Breakfast', 'Lunch', 'Dinner', 'Enjoy your meal',
  ]),
  p(11, 'Body & Health', 'Talk about your body and medical needs.', [
    'Head', 'Eyes', 'Ears', 'Nose', 'Mouth',
    'Hands', 'Feet', 'Stomach', 'Back', 'I am sick',
    'It hurts here', 'I need a doctor', 'Medicine', 'I have a headache', 'I have a fever',
    'Prescription', 'Insurance', 'Emergency', 'Ambulance', 'I feel better',
    'I feel worse', 'Rest', 'Sleep', 'Healthy', 'I am allergic to...',
  ]),
  p(12, 'Shopping & Money', 'Buy things and handle money.', [
    'How much?', 'Too expensive', 'A discount please', 'I will take it', 'I am just looking',
    'Do you have...?', 'Cash', 'Credit card', 'Receipt', 'Change',
    'Size', 'Color', 'Black', 'White', 'Red',
    'Blue', 'Green', 'Yellow', 'Open', 'Closed',
    'Market', 'Mall', 'What time do you close?', 'Can I try it on?', 'I would like to return this',
  ]),
  p(13, 'Home & Family', 'Talk about home, family, routines.', [
    'Mother', 'Father', 'Brother', 'Sister', 'Son',
    'Daughter', 'Husband', 'Wife', 'Grandmother', 'Grandfather',
    'House', 'Room', 'Kitchen', 'Bathroom', 'Bedroom',
    'Living room', 'Door', 'Window', 'Table', 'Chair',
    'Bed', 'I live in...', 'I have two brothers', 'We are a big family', 'Welcome to my home',
  ]),
  p(14, 'Work & Study', 'Workplace, school, and learning phrases.', [
    'What do you do?', 'I work as a...', 'I am a student', 'Teacher', 'Doctor',
    'Engineer', 'Office', 'Meeting', 'I have a question', 'I do not know',
    'I understand', 'Can you explain that?', 'What does this mean?', 'How do you say...?', 'Please speak slowly',
    'I am learning', 'I made a mistake', 'Well done', 'I need more time', 'The deadline is...',
    'Can you help me with this?', 'I will finish soon', 'Let me check', 'I am busy', 'I am free',
  ]),
  p(15, 'Weather & Nature', 'Describe weather and the natural world.', [
    'What is the weather like?', 'It is sunny', 'It is raining', 'It is snowing', 'It is windy',
    'It is cloudy', 'Sun', 'Moon', 'Star', 'Sky',
    'Rain', 'Snow', 'Wind', 'Tree', 'Flower',
    'Mountain', 'Beach', 'Sea', 'River', 'Animal',
    'Dog', 'Cat', 'Bird', 'Spring', 'Summer',
  ]),
  p(16, 'Communication & Tech', 'Phones, internet, staying connected.', [
    'Phone', 'Message', 'Internet', 'Wi-Fi password', 'Can I use your phone?',
    'My battery is dead', 'I will call you back', 'Text me', 'Email', 'Photo',
    'Can you take a picture?', 'Social media', 'I saw it online', 'What is your number?', 'I will send you the address',
    'The charger', 'Download', 'App', 'Password', 'I forgot my password',
    'It is not working', 'Can you fix it?', 'How does this work?', 'What is the problem?', 'I figured it out',
  ]),
  p(17, 'Common Verbs 1', 'Most used action verbs.', [
    'To be', 'To have', 'To go', 'To do', 'To make',
    'To know', 'To think', 'To see', 'To come', 'To take',
    'To give', 'To tell', 'To find', 'To put', 'To get',
    'To let', 'To keep', 'To seem', 'To mean', 'To try',
    'To ask', 'To leave', 'To feel', 'To need', 'To become',
  ]),
  p(18, 'Common Verbs 2', 'More essential verbs.', [
    'To start', 'To stop', 'To begin', 'To finish', 'To help',
    'To pay', 'To meet', 'To show', 'To hear', 'To play',
    'To run', 'To move', 'To live', 'To believe', 'To hold',
    'To bring', 'To happen', 'To write', 'To sit', 'To stand',
    'To lose', 'To remember', 'To forget', 'To open', 'To close',
  ]),
  p(19, 'Making Plans', 'Arrange meetings, events, and outings.', [
    'Are you free tomorrow?', 'Let us meet at...', 'What time works for you?', 'I am available in the morning', 'I will be there',
    'Can we reschedule?', 'I am running late', 'I am on my way', 'How about Saturday?', 'That sounds good',
    'I cannot make it', 'Count me in', 'Maybe next time', 'See you there', 'Looking forward to it',
    'Where should we meet?', 'I will pick you up', 'Do you want to grab coffee?', 'Are you busy tonight?', 'Let me know',
    'I have other plans', 'Something came up', 'Rain check?', 'I will confirm later', 'It is a date',
  ]),
  p(20, 'Invitations & Polite Requests', 'Politely ask and invite.', [
    'Would you like to join us?', 'May I come in?', 'Could you please help me?', 'Would you mind...?', 'Is it okay if...?',
    'Do you mind if I sit here?', 'I was wondering if...', 'Would it be possible to...?', 'If you do not mind', 'I would appreciate it if...',
    'Could I ask you a favor?', 'I hate to bother you but...', 'Would you be so kind as to...?', 'Please feel free to...', 'At your convenience',
    'No rush', 'Take your time', 'Whenever you are ready', 'After you', 'Allow me',
    'I insist', 'Be my guest', 'Make yourself at home', 'Help yourself', 'Do not mention it',
  ]),
  p(21, 'Complaints & Problems', 'Express dissatisfaction and solve issues.', [
    'There is a problem', 'Something is wrong', 'This is not what I ordered', 'I would like to speak to the manager', 'I am not satisfied',
    'This is broken', 'It does not work', 'I have been waiting for a long time', 'This is unacceptable', 'I want a refund',
    'You made a mistake', 'I did not say that', 'That is not fair', 'What is going on?', 'Who is responsible?',
    'I want to file a complaint', 'Can I get a replacement?', 'This is damaged', 'I was overcharged', 'The service was poor',
    'I expect better', 'This needs to be fixed', 'Who can I talk to?', 'I am very disappointed', 'Please resolve this',
  ]),
  p(22, 'Apologies & Explanations', 'Say sorry and explain yourself.', [
    'I am so sorry', 'I did not mean to', 'It was an accident', 'Please forgive me', 'I take full responsibility',
    'It was my fault', 'I should have known better', 'I was not thinking', 'There is no excuse', 'I owe you an apology',
    'Let me explain', 'What I meant was...', 'That is not what I intended', 'I misunderstood', 'My mistake',
    'I got confused', 'I was not aware', 'No one told me', 'I thought that...', 'I assumed...',
    'I should have asked', 'I will make it up to you', 'How can I fix this?', 'It will not happen again', 'I have learned my lesson',
  ]),
  p(23, 'Phone Calls & Messages', 'Talking on the phone and messaging.', [
    'Hello, this is...', 'May I speak to...?', 'Who is calling?', 'Please hold on', 'I will put you through',
    'He is not available right now', 'Can I take a message?', 'Please leave a message after the tone', 'I will call you back', 'Did you get my text?',
    'I sent you an email', 'Check your inbox', 'The line is busy', 'I have bad reception', 'You are breaking up',
    'Can you hear me?', 'Let me call you back', 'Sorry, wrong number', 'I was just about to call you', 'Thanks for calling',
    'Talk to you later', 'Keep in touch', 'Drop me a line', 'Reach out anytime', 'I look forward to hearing from you',
  ]),
  p(24, 'Education & Learning', 'School, studying, and skill-building.', [
    'I am studying...', 'I want to learn...', 'I am taking a class', 'What does this word mean?', 'How do you pronounce this?',
    'Can you spell that?', 'Please write it down', 'I need more practice', 'I passed the exam', 'I failed the test',
    'Homework', 'Assignment', 'Deadline', 'Textbook', 'Notebook',
    'I have a question', 'Could you explain it again?', 'I finally understand', 'That makes sense', 'I am not sure',
    'Let me look it up', 'I will do my best', 'Practice makes perfect', 'Knowledge is power', 'Never stop learning',
  ]),
  p(25, 'Hobbies & Free Time', 'Talk about what you enjoy doing.', [
    'What do you do for fun?', 'I like to...', 'In my free time I...', 'My hobby is...', 'I enjoy...',
    'I am into...', 'I am a big fan of...', 'Do you play any sports?', 'I love reading', 'I watch a lot of movies',
    'I listen to music', 'I play video games', 'I like to cook', 'I enjoy traveling', 'I am learning to play an instrument',
    'I go to the gym', 'I like hiking', 'Do you want to join?', 'That looks fun', 'I have never tried that',
    'How long have you been doing that?', 'You are really good at that', 'I am just a beginner', 'Maybe I will try it', 'It is relaxing',
  ]),
  p(26, 'Clothing & Appearance', 'Clothes, style, and how you look.', [
    'What are you wearing?', 'I like your outfit', 'That looks good on you', 'Where did you get that?', 'It fits perfectly',
    'It is too big', 'It is too small', 'What size do you wear?', 'Can I try this on?', 'The fitting room is over there',
    'Shirt', 'Pants', 'Dress', 'Shoes', 'Jacket',
    'Hat', 'Sunglasses', 'Watch', 'Ring', 'Necklace',
    'This color suits you', 'You look great', 'I need to change', 'Casual wear', 'Formal attire',
  ]),
  p(27, 'Transportation', 'Getting around by various means.', [
    'How do I get to...?', 'Which bus goes to...?', 'Is this seat taken?', 'How many stops?', 'Next stop please',
    'Where do I get off?', 'Does this train go to...?', 'I missed my stop', 'Is this the right platform?', 'What time is the last train?',
    'How much is the fare?', 'A round trip ticket please', 'One way please', 'Do I need to transfer?', 'Is it direct?',
    'The bus is running late', 'There is a lot of traffic', 'Can you drop me off here?', 'Parking is difficult', 'I prefer to walk',
    'Ride a bike', 'Take the subway', 'Hail a taxi', 'Rent a car', 'Carpool',
  ]),
  p(28, 'At the Hotel', 'Check in, check out, and hotel requests.', [
    'I have a reservation', 'I would like to check in', 'I would like to check out', 'What time is check-out?', 'Is breakfast included?',
    'Do you have any vacancies?', 'I would like a room with a view', 'Is there Wi-Fi?', 'What is the Wi-Fi password?', 'The key card does not work',
    'Can I get an extra towel?', 'Can I get a wake-up call?', 'The air conditioner is not working', 'There is no hot water', 'Can you call me a taxi?',
    'I would like to extend my stay', 'Is there a safe in the room?', 'What time is breakfast served?', 'Can I leave my luggage here?', 'I need a late check-out',
    'Room service please', 'Can you recommend a restaurant nearby?', 'Is there a gym?', 'The room is lovely', 'Thank you for your hospitality',
  ]),
  p(29, 'Culture & Traditions', 'Discuss customs, holidays, and culture.', [
    'What are the local customs?', 'How do people celebrate...?', 'Is there a festival this month?', 'What is the traditional food?', 'I would like to learn about your culture',
    'Is it okay to take photos here?', 'Should I take off my shoes?', 'Is there a dress code?', 'What is the proper greeting?', 'Is tipping expected?',
    'Merry Christmas', 'Happy New Year', 'Happy Easter', 'Happy holidays', 'Best wishes',
    'What is the history of this place?', 'How old is this building?', 'This is beautiful', 'I love the architecture', 'The art is amazing',
    'Tell me about your traditions', 'I respect your customs', 'I want to be respectful', 'What should I avoid doing?', 'That is fascinating',
  ]),
  p(30, 'Technology & Internet', 'Modern digital life.', [
    'My computer is slow', 'I need to update my software', 'The website is down', 'I cannot log in', 'I forgot my username',
    'Can you send me the link?', 'Check your spam folder', 'I will send you a screenshot', 'Let me share my screen', 'Can we do a video call?',
    'The file is too large', 'What format is this?', 'I need to install this app', 'Is it compatible?', 'Do you have the latest version?',
    'Back up your data', 'I lost all my files', 'It has a virus', 'Clear your cache', 'Restart your device',
    'The camera is not working', 'My microphone is muted', 'You are frozen', 'The connection is unstable', 'Try turning it off and on again',
  ]),
  p(31, 'Business & Work', 'Professional communication.', [
    'I have a meeting at...', 'Can we discuss this later?', 'Let me summarize', 'What is the next step?', 'I need your approval',
    'Please review this document', 'I will get back to you', 'Let me follow up on that', 'Here is the update', 'We are on track',
    'The project is delayed', 'I need more resources', 'What is the budget?', 'Who is in charge?', 'Can I get your input?',
    'I agree with your point', 'Let us agree to disagree', 'We need to move forward', 'That is a priority', 'I will handle it',
    'Good job everyone', 'Thank you for your hard work', 'Let us wrap this up', 'We made great progress', 'I appreciate your patience',
  ]),
  p(32, 'Negotiation & Persuasion', 'Convince, bargain, and negotiate.', [
    'Can you do a better price?', 'Is that your final offer?', 'I found it cheaper elsewhere', 'What if I buy more?', 'Can we meet halfway?',
    'I think that is reasonable', 'Let us find a solution', 'How about a compromise?', 'That works for me', 'I can accept that',
    'What are the terms?', 'Is there a warranty?', 'Are there any hidden fees?', 'Can I get that in writing?', 'I need to think about it',
    'You drive a hard bargain', 'Deal!', 'Shake on it', 'Here is what I propose', 'What would it take?',
    'Can you throw in...?', 'I am on a tight budget', 'Is this the best you can do?', 'I will take it if...', 'Let us close the deal',
  ]),
  p(33, 'Health & Wellness', 'Exercise, diet, and wellbeing.', [
    'I need to get in shape', 'I go jogging every morning', 'Do you work out?', 'I am on a diet', 'I am trying to eat healthy',
    'I have gained weight', 'I have lost weight', 'I need to drink more water', 'I am trying to quit smoking', 'I need more sleep',
    'I feel stressed', 'I need a break', 'Meditation helps me relax', 'I do yoga', 'Mental health is important',
    'Take a deep breath', 'Everything will be okay', 'One day at a time', 'You got this', 'Stay positive',
    'Eat your vegetables', 'Get some fresh air', 'Stretch every morning', 'Listen to your body', 'Self-care is not selfish',
  ]),
  p(34, 'Relationships & Dating', 'Romance, friendship, and social connections.', [
    'Are you single?', 'I would like to get to know you better', 'Can I buy you a drink?', 'You are very attractive', 'Would you like to go out sometime?',
    'I had a great time tonight', 'Can I see you again?', 'I really like you', 'I think I am falling for you', 'I love spending time with you',
    'We need to talk', 'It is not you, it is me', 'I think we should see other people', 'Let us just be friends', 'I need some space',
    'We have been together for...', 'Will you marry me?', 'Congratulations on your engagement', 'They are a great couple', 'True love exists',
    'A friend in need is a friend indeed', 'You can count on me', 'I have your back', 'Best friends forever', 'Family comes first',
  ]),
  p(35, 'Emergencies & Safety', 'Urgent situations and staying safe.', [
    'Call the police!', 'Call an ambulance!', 'Fire!', 'There has been an accident', 'I need help immediately',
    'It is an emergency', 'I have been robbed', 'Someone is following me', 'I feel unsafe', 'Is this area safe at night?',
    'Where is the emergency exit?', 'Do not panic', 'Stay calm', 'Follow me', 'Get down',
    'Is everyone okay?', 'I am calling for help', 'Stay where you are', 'Do not move', 'Everything is under control',
    'I have insurance', 'My passport was stolen', 'I need to contact the embassy', 'Can you help me file a report?', 'Thank goodness you are safe',
  ]),
  p(36, 'Advanced Conversation 1', 'Nuanced opinions and deeper discussions.', [
    'In the grand scheme of things...', 'To be perfectly honest...', 'The way I see it...', 'If I am not mistaken...', 'As far as I know...',
    'That raises an interesting point', 'I had not thought of it that way', 'You make a compelling argument', 'I see where you are coming from', 'We will have to agree to disagree',
    'Frankly speaking', 'To put it mildly', 'Needless to say', 'All things considered', 'At the end of the day',
    'It goes without saying', 'That is beside the point', 'Let us not jump to conclusions', 'I can see both sides', 'There is no easy answer',
    'It is a double-edged sword', 'Quality over quantity', 'Actions speak louder than words', 'Better late than never', 'Every cloud has a silver lining',
  ]),
  p(37, 'Advanced Conversation 2', 'Complex expressions and sophisticated vocabulary.', [
    'I could not agree more', 'That is absolutely spot on', 'You took the words right out of my mouth', 'I beg to differ', 'With all due respect',
    'That is easier said than done', 'It is not as simple as it seems', 'There is more to it than meets the eye', 'Let us not beat around the bush', 'To cut a long story short',
    'The bottom line is...', 'When it comes down to it...', 'Essentially', 'Fundamentally', 'In essence',
    'By and large', 'For the most part', 'On the whole', 'Generally speaking', 'Broadly speaking',
    'It stands to reason', 'Suffice it to say', 'To say the least', 'Not to mention', 'Last but not least',
  ]),
  p(38, 'Storytelling & Narratives', 'Tell stories and describe experiences.', [
    'Let me tell you what happened', 'You will never believe this', 'Once upon a time', 'A long time ago', 'Back in the day',
    'It all started when...', 'Before I knew it...', 'Out of nowhere', 'All of a sudden', 'As it turned out',
    'To make a long story short', 'The moral of the story is...', 'I will never forget that day', 'It was a life-changing experience', 'I learned my lesson',
    'What happened next?', 'And then what?', 'No way!', 'You are kidding!', 'I could not believe my eyes',
    'It felt like a dream', 'Time flew by', 'It was a nightmare', 'Looking back on it now', 'I would not change a thing',
  ]),
  p(39, 'Humor & Sarcasm', 'Funny phrases and playful language.', [
    'You have got to be kidding me', 'Tell me about it', 'Good luck with that', 'I will believe it when I see it', 'Do not hold your breath',
    'That went well', 'What could possibly go wrong?', 'Famous last words', 'Easier said than done', 'Thanks for nothing',
    'Well, that was awkward', 'I am not even going to ask', 'It is not rocket science', 'No offense but...', 'With friends like these...',
    'Best thing since sliced bread', 'You are the expert', 'Whatever you say', 'If you insist', 'I am all ears',
    'Not my cup of tea', 'When pigs fly', 'Break a leg', 'Speak of the devil', 'The early bird catches the worm',
  ]),
  p(40, 'Wisdom & Reflection', 'Thoughtful sayings and life reflections.', [
    'What matters most is...', 'At the end of the day...', 'Life is too short to...', 'You only live once', 'Everything happens for a reason',
    'What will be, will be', 'Time heals all wounds', 'Patience is a virtue', 'Honesty is the best policy', 'Where there is a will, there is a way',
    'Rome was not built in a day', 'No pain, no gain', 'Practice makes perfect', 'Knowledge is power', 'The journey is the destination',
    'Do not judge a book by its cover', 'Two heads are better than one', 'The grass is always greener', 'Home is where the heart is', 'Love conquers all',
    'It is never too late', 'Every moment counts', 'Cherish the little things', 'Be the change you wish to see', 'Live and let live',
  ]),
];

export const TOTAL_CORE_PHRASES = CORE_PACKS.reduce((sum, p) => sum + p.phrases.length, 0);

export function getCorePhraseById(id: string): CorePhrase | undefined {
  for (const pack of CORE_PACKS) {
    const found = pack.phrases.find((p) => p.id === id);
    if (found) return found;
  }
  return undefined;
}